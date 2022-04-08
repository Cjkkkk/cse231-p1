import { Stmt, Expr, BinOp } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

type CompileResult = {
  wasmSource: string,
};

var localEnv:LocalEnv = new Map<string, boolean>();
export function compile(source: string) : CompileResult {
  const ast = parse(source);
  const definedVars = new Set();
  ast.forEach(s => {
    switch(s.tag) {
      case "define":
        definedVars.add(s.name);
        localEnv.set(s.name, true)
        break;
    }
  }); 
  const scratchVar : string = `(local $$last i32)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })
  
  const commandGroups = ast.map((stmt) => codeGen(stmt));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
  };
}

function codeGen(stmt: Stmt) : Array<string> {
  switch(stmt.tag) {
    case "assign":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}


function op2wasm(op: BinOp): string {
  switch(op) {
    case BinOp.Plus:
      return "(i32.add)";
    case BinOp.Minus:
      return "(i32.sub)";
    case BinOp.Mul:
      return "(i32.mul)";
    default:
      throw new Error("Unsupported op type: " + op);
  }
}


function codeGenExpr(expr : Expr) : Array<string> {
  switch(expr.tag) {
    case "binary":
      const leftStmts = codeGenExpr(expr.lhs);
      const rightStmts = codeGenExpr(expr.rhs);
      const opStmt = op2wasm(expr.op);
      return [...leftStmts, ...rightStmts, opStmt];
    case "literal":
      return ["(i32.const " + expr.value + ")"];
    case "name":
      if(!localEnv.has(expr.name)) {
        throw new Error("ReferenceError: " + expr.name + " is not defined")
      }
      return [`(local.get $${expr.name})`];
  }
}
