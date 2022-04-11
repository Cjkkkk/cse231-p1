
import { BinOp, Expr, Stmt, Type, UniOp } from "./ast";

type FunctionsEnv = Map<string, [Type[], Type]>;
type BodyEnv = Map<string, Type>;

function assert(value: boolean) {
    if(!value) throw new Error("Assertion fail"); 
}

function getCurrentVariableScope(variables : BodyEnv[]): BodyEnv {
    assert(variables.length > 0);
    return variables[variables.length - 1];
}

function getCurrentFunctionScope(functions : FunctionsEnv[]): FunctionsEnv {
    assert(functions.length > 0);
    return functions[functions.length - 1];
}


function enterNewVariableScope(variables : BodyEnv[]): BodyEnv[] {
    variables.push(new Map<string, Type>());
    return variables;
}


function exitCurrentVariableScope(variables : BodyEnv[]): BodyEnv[] {
    variables.pop();
    return variables;
}


function enterNewFunctionScope(functions : FunctionsEnv[]): FunctionsEnv[] {
    functions.push(new Map<string, [Type[], Type]>());
    return functions;
}

function exitCurrentFunctionScope(functions : FunctionsEnv[]): FunctionsEnv[] {
    functions.pop();
    return functions;
}

export function tcExpr(e : Expr<any>, functions : FunctionsEnv[], variables : BodyEnv[]) : Expr<Type> {
    var func = getCurrentFunctionScope(functions);
    var variable = getCurrentVariableScope(variables);
    switch(e.tag) {
        case "literal":
        if( e.value.tag == "num") {
            return { ...e, a: Type.Int };
        } else if (e.value.tag == "true") {
            return { ...e, a: Type.Bool }; 
        } else if (e.value.tag == "false") {
            return { ...e, a: Type.Bool };
        } else {
            // TODO: fix none
            return { ...e, a: Type.None };
        }
        case "binary": {
            const lhs = tcExpr(e.lhs, functions, variables);
            const rhs = tcExpr(e.rhs, functions, variables);
            switch(e.op) {
                case BinOp.Plus: 
                case BinOp.Minus:
                case BinOp.Mul:
                case BinOp.Div: 
                case BinOp.Mod:
                    if (lhs.a != Type.Int || rhs.a != Type.Int) {
                        throw new Error(`Expected type Int but got type ${lhs.a} and type ${rhs.a}`)
                    }
                    return { ...e, a: Type.Int, lhs, rhs};
                case BinOp.Equal:
                case BinOp.Unequal:
                    if (lhs.a != rhs.a) {
                        throw new Error(`Expected type equality of lhs and rhs but got type ${lhs.a} and type ${rhs.a}`)
                    }
                    return { ...e, a: Type.Bool, lhs, rhs};
                case BinOp.Gt: 
                case BinOp.Ge:
                case BinOp.Lt:
                case BinOp.Le:
                    if (lhs.a != Type.Int || rhs.a != Type.Int) {
                        throw new Error(`Expected type Int but got type ${lhs.a} and type ${rhs.a}`)
                    }
                    return { ...e, a: Type.Bool, lhs, rhs };
                case BinOp.Is: 
                    // todo: fix this
                    return { ...e, a: Type.Bool, lhs, rhs };
            }
        }

        case "unary": {
            const expr = tcExpr(e.expr, functions, variables);
            switch(e.op) {
                case UniOp.Not: 
                    if (expr.a != Type.Bool) {
                        throw new Error(`Expected type Bool but got type ${expr.a}`)
                    }
                    return { ...e, a: Type.Bool, expr: expr };
                case UniOp.Neg: 
                    if (expr.a != Type.Int) {
                        throw new Error(`Expected type Int but got type ${expr.a}`)
                    }
                    return { ...e, a: Type.Int, expr: expr };
            }
        }
        case "name": {
            let [found, t] = lookUpVar(variables, e.name, false);
            if (!found) {
                throw new Error(`Reference error: ${e.name} is not defined`)
            }
            return { ...e, a: t};
        }
        case "call":
            if(e.name === "print") {
                if(e.args.length !== 1) { throw new Error("print expects a single argument"); }
                const newArgs = [tcExpr(e.args[0], functions, variables)];
                const res : Expr<Type> = { ...e, a: Type.None, args: newArgs } ;
                return res;
            }
            let [found, t] = lookUpFunc(functions, e.name, false);
            if(!found) {
                throw new Error(`function ${e.name} not found`);
            }

            const [args, ret] = t;
            if(args.length !== e.args.length) {
                throw new Error(`Expected ${args.length} arguments but got ${e.args.length}`);
            }

            const newArgs = args.map((a, i) => {
                const argtyp = tcExpr(e.args[i], functions, variables);
                if(a !== argtyp.a) { throw new Error(`Got ${argtyp} as argument ${i + 1}, expected ${a}`); }
                return argtyp
            });

            return { ...e, a: ret, args: newArgs };
    }
}


function lookUpVar(variables : BodyEnv[], name: string, current: boolean): [boolean, Type] {
    var end = current? variables.length - 1: 0;
    for(var i = variables.length - 1; i >= end; i --) {
        if(variables[i].has(name)) return [true, variables[i].get(name)];
    }
    // throw new Error(`Reference error: variable ${name} is not defined`)
    return [false, Type.None];
}


function defineNewVar(variables : BodyEnv[], name: string, type: Type) {
    getCurrentVariableScope(variables).set(name, type);
}

function lookUpFunc(functions: FunctionsEnv[], name: string, current: boolean): [boolean, [Type[], Type]] {
    var end = current? functions.length - 1: 0;
    for(var i = functions.length - 1; i >= end; i --) {
        if(functions[i].has(name)) return [true, functions[i].get(name)];
    }
    // throw new Error(`Reference error: function ${name} is not defined`)
    return [false, [[], Type.None]];
}


function defineNewFunc(functions: FunctionsEnv[], name: string, sig: [Type[], Type]) {
    getCurrentFunctionScope(functions).set(name, sig);
}

export function tcStmt(s : Stmt<any>, functions : FunctionsEnv[], variables : BodyEnv[], currentReturn : Type) : Stmt<Type> {
    switch(s.tag) {
        case "declare": {
            const rhs = tcExpr(s.value, functions, variables);
            if ( rhs.a != s.type) {
                throw new Error(`Incompatible type when declaring variable ${s.name} of type ${s.type} using type ${rhs.a}`)
            }
            let [found, t] = lookUpVar(variables, s.name, true);
            if (found) {
                throw new Error(`Redefine variable: ${s.name}`)
            }
            defineNewVar(variables, s.name, rhs.a);
            return { ...s, value: rhs };
        }

        
        case "assign": {
            const rhs = tcExpr(s.value, functions, variables);
            let [found, t] = lookUpVar(variables, s.name, false);
            if (!found) {
                throw new Error(`Reference error: ${s.name} is not defined`);
            }
            if(found && t !== rhs.a) {
                throw new Error(`Cannot assign ${rhs} to ${t}`);
            }
            
            // variable.set(s.name, rhs.a);
            return { ...s, value: rhs };
        }

        case "define": {
            defineNewFunc(functions, s.name, [s.params.map(p => p.type), s.ret]);

            functions = enterNewFunctionScope(functions);
            variables = enterNewVariableScope(variables);

            s.params.forEach(p => { defineNewVar(variables, p.name, p.type)});

            checkDefinition(s.body);
            const newBody = s.body.map(bs => tcStmt(bs, functions, variables, s.ret));
            
            exitCurrentFunctionScope(functions);
            exitCurrentVariableScope(variables);
            return { ...s, body: newBody };
        }

        case "if": {
            const newIfCond = tcExpr(s.ifCond, functions, variables);
            
            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);
            const newIfBody = s.ifBody.map(bs => tcStmt(bs, functions, variables, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);

            const newElif = s.elif.map(bs => {
                let cond = tcExpr(bs.cond, functions, variables);
                
                // functions = enterNewFunctionScope(functions);
                // variables = enterNewVariableScope(variables);

                let body = bs.body.map(bb => tcStmt(bb, functions, variables, currentReturn))

                // exitCurrentFunctionScope(functions);
                // exitCurrentVariableScope(variables);
                return {
                    cond: cond, 
                    body: body
                }});
            
            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);
            
            const newElseBody = s.elseBody.map(bs => tcStmt(bs, functions, variables, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);

            return {...s, ifCond: newIfCond, ifBody: newIfBody, elif: newElif, elseBody: newElseBody}
        }

        case "while": {
            const newCond = tcExpr(s.cond, functions, variables);

            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);

            const newBody = s.body.map(bs => tcStmt(bs, functions, variables, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);
            return { ...s, cond: newCond, body: newBody };
        }

        case "pass": {
            return s;
        }
        case "expr": {
            const ret = tcExpr(s.expr, functions, variables);
            return { ...s, expr: ret };
        }
        case "return": {
            const valTyp = tcExpr(s.value, functions, variables);
            if(valTyp.a !== currentReturn) {
                throw new Error(`${valTyp.a} returned but ${currentReturn} expected.`);
            }
            return { ...s, value: valTyp };
        }
    }
}

export function checkDefinition(p : Stmt<any>[]) {
    var LastDeclare = -1;
    var firstStmt = p.length;
    for(var i = 0; i < p.length; i ++) {
        if (p[i].tag == "declare" || p[i].tag == "define") {
            LastDeclare = i;
        } else {
            firstStmt = i;
        }

        if (LastDeclare > firstStmt) {
            throw new Error("Can not define variable and func after")
        }
    }
}


export function tcProgram(p : Stmt<any>[]) : Stmt<Type>[] {
    const functions = [new Map<string, [Type[], Type]>()];
    const variables = [new Map<string, Type>()];

    checkDefinition(p);
    return p.map(s => {
        const res = tcStmt(s, functions, variables, Type.None);
        return res;
    });
}