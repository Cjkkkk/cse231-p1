import wabt from 'wabt';
import {Stmt, Expr, Type, BinOp, UniOp, ClassStmt, isClass} from './ast';
import {parse} from './parser';
import {tcProgram } from './tc';

type Env = Set<string>;
type ClassEnv = Map<string, Map<string, number>>;
var loop_label = 0;

function variableNames(stmts: Stmt<Type>[]) : string[] {
    const vars : Array<string> = [];
    stmts.forEach((stmt) => {
        if(stmt.tag === "var") { vars.push(stmt.var.name); }
    });
    return vars;
}

function funs(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag === "func");
}

function nonFuns(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag !== "func" && stmt.tag !== "class" );
}

function classes(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag === "class");
}

function varsFunsClassesStmts(stmts: Stmt<Type>[]) : [string[], Stmt<Type>[], Stmt<Type>[], Stmt<Type>[]] {
    return [variableNames(stmts), funs(stmts), classes(stmts), nonFuns(stmts)];
}

export async function run(watSource : string, config: any) : Promise<number> {
    const wabtApi = await wabt();

    const parsed = wabtApi.parseWat("example", watSource);
    const binary = parsed.toBinary({});
    const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
    return (wasmModule.instance.exports as any)._start();
}

export function binOpStmts(op : BinOp) {
    switch(op) {
        case BinOp.Plus: return [`i32.add`];
        case BinOp.Minus: return [`i32.sub`];
        case BinOp.Mul: return [`i32.mul`];
        case BinOp.Div: return [`i32.div_s`];
        case BinOp.Mod: return [`i32.rem_s`];
        case BinOp.Equal: return [`i32.eq`];
        case BinOp.Unequal: return [`i32.ne`];
        case BinOp.Gt: return [`i32.gt_s`];
        case BinOp.Ge: return [`i32.ge_s`];
        case BinOp.Lt: return [`i32.lt_s`];
        case BinOp.Le: return [`i32.le_s`];
        case BinOp.Is: return [`i32.eq`];
        default:
            throw new Error(`Unhandled or unknown binary op: ${op}`);
    }
}

export function unaryOpStmts(op : UniOp) {
    switch(op) {
        case UniOp.Not: return [`i32.eqz`];
        case UniOp.Neg: return [`i32.sub`];
        default:
            throw new Error(`Unhandled or unknown unary op: ${op}`);
    }
}

export function codeGenExpr(expr : Expr<Type>, locals: Env, classEnv: ClassEnv) : Array<string> {
    switch(expr.tag) {
        case "literal": {
            // TODO: fix none
            if( expr.value === "none") {
                return [`i32.const -2147483648`];
            } else if (expr.value === "true") {
                return [`i32.const 1`];
            } else if (expr.value === "false") {
                return [`i32.const 0`];
            } else {
                return [`i32.const ${expr.value}`];
            }
        }
        case "name": {
            // Since we type-checked for making sure all variable exist, here we
            // just check if it's a local variable and assume it is global if not
            if(locals.has(expr.name)) { return [`local.get $${expr.name}`]; }
            else { return [`global.get $${expr.name}`]; }
        }
        case "unary": {
            var exprs = codeGenExpr(expr.expr, locals, classEnv);
            if (expr.op === UniOp.Neg) {
                // does not have i32.neg
                exprs = codeGenExpr({tag: "literal", value: 0}, locals, classEnv).concat(exprs);
            }
            const opstmts = unaryOpStmts(expr.op);
            return [...exprs, ...opstmts];
        }
        case "binary": {
            const lhsExprs = codeGenExpr(expr.lhs, locals, classEnv);
            const rhsExprs = codeGenExpr(expr.rhs, locals, classEnv);
            const opstmts = binOpStmts(expr.op);
            return [...lhsExprs, ...rhsExprs, ...opstmts];
        }
        case "call":{
            const valStmts = expr.args.map(e => codeGenExpr(e, locals, classEnv)).flat();
            
            let toCall = expr.name;
            if (expr.name === "print") {
                switch(expr.args[0].a) {
                    case "bool": toCall = "print_bool"; break;
                    case "int": toCall = "print_num"; break;
                    case "none": toCall = "print_none"; break;
                }
            } else if(classEnv.has(expr.name)) {
                // is class init call
                valStmts.push(`i32.const -2147483648`);
                toCall = expr.name + "$__init__";
            }
            valStmts.push(`call $${toCall}`);
            return valStmts;
        }
        case "method": {
            // TODO: add self here
            const objStmts = codeGenExpr(expr.obj, locals, classEnv);
            const argsStmts = expr.args.map(e => codeGenExpr(e, locals, classEnv)).flat();
            return [
                ...objStmts, // self
                ...argsStmts,
                `call $${expr.obj.a}$${expr.name}`
            ];
        }

        case "getfield": {
            const ObjStmt = codeGenExpr(expr.obj, locals, classEnv);
            return [
                ...ObjStmt,
                `i32.const ${classEnv.get(expr.obj.a).get(expr.name)}`,
                `i32.add`,
                `i32.load`
            ]
        }
    }
}


export function codeGenStmt(stmt: Stmt<Type>, locals: Env, classEnv: ClassEnv) : Array<string> {
    switch(stmt.tag) {
        case "class": {
            // generate for __init__ function
            let initFuncStmts = [`(func $${stmt.name}$__init__ (param $self i32) (result i32)`];
            stmt.fields.map((f, i)=>{
                initFuncStmts.push(
                    `global.get $heap`,
                    `i32.const ${i * 4}`,
                    `i32.add`,
                    ...codeGenExpr(f.value, locals, classEnv),
                    `i32.store`
                )
            })
            initFuncStmts.push(
                `global.get $heap`,
                `global.get $heap`,
                `i32.const ${stmt.fields.length * 4}`,
                `i32.add`,
                `global.set $heap`,
                `)`
            );

            let methodsStmts = stmt.methods.map((f) => {
                let stmts = codeGenStmt({...f, name: `${stmt.name}$${f.name}`}, locals, classEnv);
                if (f.name === "__init__") {
                    stmts = [...initFuncStmts, `local.set $self`, ...stmts.slice(1), `local.get $self`]
                }
                return stmts;
            }).flat();

            if (stmt.methods.some((f)=>f.name === "__init__")) {
                return methodsStmts;
            } else {
                return [...initFuncStmts, ...methodsStmts];
            }
        }
        case "func": {
            const newLocals = new Set(locals);
            // Construct the environment for the function body
            const variables = variableNames(stmt.body);
            // Construct the code for params and variable declarations in the body
            const params = stmt.params.map(p => `(param $${p.name} i32)`).join(" ");
            const varDecls = variables.map(v => `(local $${v} i32)`);
            
            variables.forEach(v => newLocals.add(v));
            stmt.params.forEach(p => newLocals.add(p.name));
            
            const stmts = stmt.body.map(s => codeGenStmt(s, newLocals, classEnv)).flat();
            return [`(func $${stmt.name} ${params} (result i32)`,
                    `(local $scratch i32)`,
                    ...varDecls,
                    ...stmts,
                    `i32.const 0`,
                    `)`];
        }
        case "var": {
            var valStmts = codeGenExpr(stmt.value, locals, classEnv);
            if(locals.has(stmt.var.name)) { valStmts.push(`local.set $${stmt.var.name}`); }
            else { valStmts.push(`global.set $${stmt.var.name}`); }
            return valStmts;
        }
        case "assign": {
            if (stmt.name.tag === "name") {
                var valStmts = codeGenExpr(stmt.value, locals, classEnv);
                if(locals.has(stmt.name.name)) { valStmts.push(`local.set $${stmt.name.name}`); }
                else { valStmts.push(`global.set $${stmt.name.name}`); }
                return valStmts;
            } else {
                var objStmts = codeGenExpr(stmt.name, locals, classEnv);
                var valStmts = codeGenExpr(stmt.value, locals, classEnv);
                // getfield as lhs
                objStmts.pop(); // should not load
                valStmts.push(`i32.store`);
                return [...objStmts, ...valStmts];
            }
        }
        case "if": {
            var result = [];
            var ifCond = codeGenExpr(stmt.if.cond, locals, classEnv);

            var ifBody = stmt.if.body.map((v) => codeGenStmt(v, locals, classEnv)).flat();
            var enclosingCount = 0;
            result.push(...ifCond, `(if`, `(then`, ...ifBody, `)`);
            enclosingCount += 1;
            for(var elif of stmt.elif) {
                var elifCond = codeGenExpr(elif.cond, locals, classEnv);
                var elifBody = elif.body.map((v) => codeGenStmt(v, locals, classEnv)).flat();;
                result.push(`(else`, ...elifCond, `(if`, `(then`, ...elifBody, `)`);
                enclosingCount += 2;
            }

            var elseBody = stmt.else.map((v) => codeGenStmt(v, locals, classEnv)).flat();
            result.push(`(else`, ...elseBody, `)`, ...Array(enclosingCount).fill(")"));
            return result;
        }
        case "while": {
            var condLabel = loop_label;
            loop_label += 1;
            var bodyLabel = loop_label;
            loop_label += 1;
            var condExpr = codeGenExpr(stmt.while.cond, locals, classEnv);

            // var locals = variableNames(stmt.while.body);
            // var varDecls = locals.map(v => `(local $${v} i32)`);

            var bodyStmts = stmt.while.body.map(s => codeGenStmt(s, locals, classEnv)).flat();
            return [`(block $label_${bodyLabel}`,
                    `(loop $label_${condLabel}`,
                    ...condExpr,
                    `i32.eqz`,
                    `br_if $label_${bodyLabel}`,
                    // ...varDecls,
                    ...bodyStmts,
                    `br $label_${condLabel}`,`)`,`)`];
        }
        case "pass": {
            return [`nop`];
        }
        case "return": {
            var valStmts = codeGenExpr(stmt.value, locals, classEnv);
            valStmts.push(`return`);
            return valStmts;
        }
        case "expr": {
            const result = codeGenExpr(stmt.expr, locals, classEnv);
            result.push(`local.set $scratch`);
            return result;
        }
    }
}

function addIndent(stmts: Array<string>, ident: number) :Array<string> {
    for(let i = 0; i < stmts.length; i++) {
        if(stmts[i].startsWith("(func") 
            || stmts[i].startsWith("(loop") 
            || stmts[i].startsWith("(block")
            || stmts[i].startsWith("(if")
            || stmts[i].startsWith("(then")
            || stmts[i].startsWith("(else")) {
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
            ident += 1;
        } else if(stmts[i].startsWith(")")) {
            ident -= 1;
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
        } else {
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
        }
    }
    return stmts;
}


function calculateOffset(classEnv: ClassEnv, stmt: ClassStmt<any>) {
    const env = new Map<string, number>();
    let currentOffset = 0;
    stmt.fields.forEach((f) => {
        env.set(f.var.name, currentOffset);
        currentOffset += 4;
    });

    // env.set("0", currentOffset);
    classEnv.set(stmt.name, env);
}


export function compile(source : string) : string {
    let ast = parse(source);
    ast = tcProgram(ast);
    const [vars, funs, classes, stmts] = varsFunsClassesStmts(ast);
    
    const locals = new Set<string>();
    const classEnv = new Map<string, Map<string, number>>();

    classes.forEach((c) => {
        calculateOffset(classEnv, (c as ClassStmt<string>));
    });

    const classCode = classes.map(f => addIndent(codeGenStmt(f, locals, classEnv), 1)).map(f=> f.join("\n")).join("\n\n");
    const funsCode = funs.map(f => addIndent(codeGenStmt(f, locals, classEnv), 1)).map(f => f.join("\n")).join("\n\n");
    const varDeclCode = addIndent(vars.map(v => `(global $${v} (mut i32) (i32.const 0))`), 1).join("\n");
    const allStmts = stmts.map(s => codeGenStmt(s, locals, classEnv)).flat();

    const lastStmt = ast[ast.length - 1];
    const isExpr = lastStmt.tag === "expr";
    var retType = "";
    var main = "";
    if(isExpr) {
        retType = "(result i32)";
        main = addIndent([`(local $scratch i32)`, ...allStmts, "local.get $scratch"], 2).join("\n");
    } else {
        main = addIndent([`(local $scratch i32)`, ...allStmts], 2).join("\n");
    }

    return `
(module
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (memory $0 1)
    (global $heap (mut i32) (i32.const 0))
${varDeclCode}
${classCode}
${funsCode}
    (func (export "_start") ${retType}
${main}
    )
) `;
}