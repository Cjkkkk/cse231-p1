import { Stmt, Expr } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

type CompileResult = {
  wasmSource: string,
};

export function compile(source: string) : CompileResult {
  const ast = parse(source);
  const definedVars = new Set();
  ast.forEach(s => {
    switch(s.tag) {
      case "define":
        definedVars.add(s.name);
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
    case "define":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}


function op2wasm(op: string): string {
  switch(op) {
    case "+":
      return "i32.add";
    case "-":
      return "i32.sub";
    case "*":
      return "i32.mul";
    default:
      throw new Error("Unsupported op type: " + op);
  }
}


function codeGenExpr(expr : Expr) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg);
      if(expr.name == "print") {
        return argStmts.concat([`(call $${expr.name})`]);
      } else if (expr.name == "abs") {
        return argStmts.concat([`(call $${expr.name})`]);
      } else {
        throw new Error("Unsupported builtin function: " + expr.name);
      }
    case "builtin2":
      const argStmts1 = codeGenExpr(expr.arg1);
      const argStmts2 = codeGenExpr(expr.arg2);
      if(expr.name == "max") {
        return ["(select "].concat(argStmts1, argStmts2, [`(i32.ge_s)\n)`]);
      } else if (expr.name == "min") {
        return ["(select "].concat(argStmts1, argStmts2, [`(i32.le_s)\n)`]);
      } else if (expr.name == "pow") {
        return argStmts1.concat(argStmts2, [`(call $${expr.name})`]);
      } else {
        throw new Error("Unsupported builtin function: " + expr.name);
      }
    case "binary":
      const leftStmts = codeGenExpr(expr.left);
      const rightStmts = codeGenExpr(expr.right);
      return leftStmts.concat(rightStmts, [op2wasm(expr.op)]);
    case "num":
      return ["(i32.const " + expr.value + ")"];
    case "id":
      return [`(local.get $${expr.name})`];
  }
}
