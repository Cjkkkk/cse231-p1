import wabt from 'wabt';
import {Stmt, Expr, Type, BinOp, UniOp} from './ast';
import {parse} from './parser';
import { tcProgram } from './tc';

type Env = Map<string, boolean>;
var loop_label = 0;

function variableNames(stmts: Stmt<Type>[]) : string[] {
    const vars : Array<string> = [];
    stmts.forEach((stmt) => {
        if(stmt.tag === "assign") { vars.push(stmt.name); }
    });
    return vars;
    }
function funs(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag === "define");
}
function nonFuns(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag !== "define");
}
function varsFunsStmts(stmts: Stmt<Type>[]) : [string[], Stmt<Type>[], Stmt<Type>[]] {
    return [variableNames(stmts), funs(stmts), nonFuns(stmts)];
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

export function codeGenExpr(expr : Expr<Type>, locals : Env) : Array<string> {
    switch(expr.tag) {
        case "literal":
            if( expr.value.tag == "num") {
                return [`(i32.const ${expr.value})`];
            } else if (expr.value.tag == "true") {
                return [`(i32.const 1)`];
            } else if (expr.value.tag == "false") {
                return [`(i32.const 0)`];
            } else {
                // TODO: fix none
                return [`(i32.const 0)`];
            }
        case "name":
            // Since we type-checked for making sure all variable exist, here we
            // just check if it's a local variable and assume it is global if not
            if(locals.has(expr.name)) { return [`(local.get $${expr.name})`]; }
            else { return [`(global.get $${expr.name})`]; }
        
        case "unary": {
            var exprs = codeGenExpr(expr.expr, locals);
            if (expr.op == UniOp.Neg) {
                // does not have i32.neg
                exprs = codeGenExpr({tag: "literal", value: {tag: "num", value: 0}}, locals).concat(exprs);
            }
            const opstmts = unaryOpStmts(expr.op);
            return [...exprs, ...opstmts];
            }
        case "binary": {
            const lhsExprs = codeGenExpr(expr.lhs, locals);
            const rhsExprs = codeGenExpr(expr.rhs, locals);
            const opstmts = binOpStmts(expr.op);
            return [...lhsExprs, ...rhsExprs, ...opstmts];
            }
        case "call":
            const valStmts = expr.args.map(e => codeGenExpr(e, locals)).flat();
            let toCall = expr.name;
            if(expr.name === "print") {
                switch(expr.args[0].a) {
                case Type.Bool: toCall = "print_bool"; break;
                case Type.Int: toCall = "print_num"; break;
                case Type.None: toCall = "print_none"; break;
                }
            }
            valStmts.push(`(call $${toCall})`);
            return valStmts;
    }
}
export function codeGenStmt(stmt : Stmt<Type>, locals : Env) : Array<string> {
    switch(stmt.tag) {
        case "define":
            const withParamsAndVariables = new Map<string, boolean>(locals.entries());

            // Construct the environment for the function body
            const variables = variableNames(stmt.body);
            variables.forEach(v => withParamsAndVariables.set(v, true));
            stmt.params.forEach(p => withParamsAndVariables.set(p.name, true));

            // Construct the code for params and variable declarations in the body
            const params = stmt.params.map(p => `(param $${p.name} i32)`).join(" ");
            const varDecls = variables.map(v => `(local $${v} i32)`).join("\n");

            const stmts = stmt.body.map(s => codeGenStmt(s, withParamsAndVariables)).flat();
            const stmtsBody = stmts.join("\n");
            return [`(func $${stmt.name} ${params} (result i32)
                (local $scratch i32)
                ${varDecls}
                ${stmtsBody}
                (i32.const 0))`];
        case "assign":
            var valStmts = codeGenExpr(stmt.value, locals);
            if(locals.has(stmt.name)) { valStmts.push(`(local.set $${stmt.name})`); }
            else { valStmts.push(`(global.set $${stmt.name})`); }
            return valStmts;
        case "if":
            return []
        case "while":
            var valStmts = [`loop $label_${loop_label}`];
            loop_label += 1;
            valStmts = valStmts.concat(codeGenExpr(stmt.cond, locals));
        case "pass":
            return ["nop"];
        case "return":
            var valStmts = codeGenExpr(stmt.value, locals);
            valStmts.push("return");
            return valStmts;
        case "expr":
            const result = codeGenExpr(stmt.expr, locals);
            result.push("(local.set $scratch)");
            return result;
    }
}
export function compile(source : string) : string {
    let ast = parse(source);
    ast = tcProgram(ast);
    const emptyEnv = new Map<string, boolean>();
    const [vars, funs, stmts] = varsFunsStmts(ast);
    const funsCode : string[] = funs.map(f => codeGenStmt(f, emptyEnv)).map(f => f.join("\n"));
    const allFuns = funsCode.join("\n\n");
    const varDecls = vars.map(v => `(global $${v} (mut i32) (i32.const 0))`).join("\n");

    const allStmts = stmts.map(s => codeGenStmt(s, emptyEnv)).flat();

    const main = [`(local $scratch i32)`, ...allStmts].join("\n");

    const lastStmt = ast[ast.length - 1];
    const isExpr = lastStmt.tag === "expr";
    var retType = "";
    var retVal = "";
    if(isExpr) {
        retType = "(result i32)";
        retVal = "(local.get $scratch)"
    }

    return `
        (module
        (func $print_num (import "imports" "print_num") (param i32) (result i32))
        (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
        (func $print_none (import "imports" "print_none") (param i32) (result i32))
        ${varDecls}
        ${allFuns}
        (func (export "_start") ${retType}
            ${main}
            ${retVal}
        )
        ) 
    `;
}