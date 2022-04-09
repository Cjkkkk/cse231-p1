import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import {BinOp, Expr, Stmt, UniOp, Type, Parameter, Elif} from "./ast";

export function traverseArgs(c : TreeCursor, s : string) : Array<Expr> {
  var args: Array<Expr> = [];
  c.firstChild();
  while(c.nextSibling()) {
    args.push(traverseExpr(c, s));
    c.nextSibling();
  }
  c.parent();
  return args;
}

export function traverseType(c : TreeCursor, s : string) : Type {
  switch(c.type.name) {
    case "VariableName":
      const name = s.substring(c.from, c.to);
      if(name == "int") {
        return Type.Int;
      } else if(name == "bool") {
        return Type.Bool
      }
      throw new Error("Unknown type: " + name)
    default:
      throw new Error("Unknown type: " + c.type.name)

  }
}

export function traverseParameters(c : TreeCursor, s : string) : Array<Parameter> {
  c.firstChild();  // Focuses on open paren
  const parameters = []
  c.nextSibling(); // Focuses on a VariableName
  while(c.type.name !== ")") {
    var name = s.substring(c.from, c.to);
    c.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    var nextTagName = c.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if(nextTagName !== "TypeDef") { throw new Error("Missed type annotation for parameter " + name)};
    c.firstChild();  // Enter TypeDef
    c.nextSibling(); // Focuses on type itself
    var type = traverseType(c, s);
    c.parent();
    c.nextSibling(); // Move on to comma or ")"
    parameters.push({name, type});
    c.nextSibling(); // Focuses on a VariableName
  }
  c.parent();       // Pop to ParamList
  return parameters;
}

export function traverseExpr(c : TreeCursor, s : string) : Expr {
  switch(c.type.name) {
    case "Boolean":
      if (s.substring(c.from, c.to) == "True") {
          return { tag: "literal", value: { tag: "true"} };
      } else {
          return { tag: "literal", value: { tag: "false"} };
      }
    case "None":
      return { tag: "literal", value: { tag: "none"} };
    case "Number":
      return { tag: "literal", value: { tag: "num", value: Number(s.substring(c.from, c.to))} }
    case "VariableName":
      return {
        tag: "name",
        name: s.substring(c.from, c.to)
      };
    case "ParenthesizedExpression":
      c.firstChild(); // (
      c.nextSibling();
      var rexpr = traverseExpr(c, s);
      c.parent();
      return rexpr;
    case "UnaryExpression":
      c.firstChild();
      var uniOp: UniOp;
      switch(s.substring(c.from, c.to)) {
        case "not":
          uniOp = UniOp.Not;
          break;
        case "-":
          uniOp = UniOp.Neg;
          break;
        default:
          throw new Error("PARSE ERROR: unknown Unary operator");
      }
      c.nextSibling();
      const expr = traverseExpr(c, s);
      c.parent();
      return {
        tag: "unary",
        op: uniOp,
        expr: expr
      };
    case "BinaryExpression":
      c.firstChild();
      const left = traverseExpr(c, s);
      c.nextSibling(); // go to left
      var op: BinOp; 
      switch(s.substring(c.from, c.to)) {
        case "+":
          op = BinOp.Plus;
          break;
        case "-":
          op = BinOp.Minus;
          break;
        case "*":
          op = BinOp.Mul;
          break;
        case "/":
          op = BinOp.Div;
          break;
        case "%":
          op = BinOp.Mod;
          break;
        case "==":
          op = BinOp.Equal;
          break;
        case "!=":
          op = BinOp.Unequal;
          break;
        case ">=":
          op = BinOp.Ge;
          break;
        case "<=":
          op = BinOp.Le;
          break;
        case "<":
          op = BinOp.Lt;
          break;
        case ">":
          op = BinOp.Gt;
          break;
        case "is":
          op = BinOp.Is;
          break;
        default:
          throw new Error("PARSE ERROR: unknown binary operator")
      };
      c.nextSibling(); // go to right
      const right = traverseExpr(c, s);
      c.parent();
      return {
        tag: "binary",
        op: op,
        lhs: left,
        rhs: right
      };
    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling();
      const args = traverseArgs(c, s);
      c.parent();
      return {
        tag: "call",
        name: callName,
        args: args,
      };
    default:
      throw new Error("Could not parse expr at " + c.type.name + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt {
  switch(c.node.type.name) {      
    case "AssignStatement":
      c.firstChild(); // go to name
      const vname = s.substring(c.from, c.to);
      c.nextSibling(); // go to equals
      c.nextSibling(); // go to value
      const value = traverseExpr(c, s);
      c.parent();
      return {
        tag: "assign",
        name: vname,
        value: value
      }
      case "FunctionDefinition":
        c.firstChild();  // Focus on def
        c.nextSibling(); // Focus on name of function
        var name = s.substring(c.from, c.to);
        c.nextSibling(); // Focus on ParamList
        var args = traverseParameters(c, s)
        c.nextSibling(); // Focus on Body or TypeDef
        var ret : Type;
        var maybeTD = c;
        if(maybeTD.type.name === "TypeDef") {
          c.firstChild();
          ret = traverseType(c, s);
          c.parent();
        }
        c.nextSibling(); // body
        c.firstChild(); // :
        const body = [];
        while(c.nextSibling()) {
          body.push(traverseStmt(c, s));
        }
        c.parent();      // Pop to Body
        c.parent();      // Pop to FunctionDefinition
        return {
          tag: "define", 
          name: name,
          args: args,
          body: body, 
          ret: ret
        }
    case "IfStatement":
      c.firstChild(); // if
      c.nextSibling(); // if expr
      var ifCond = traverseExpr(c, s);
      var ifBody = [];
      c.nextSibling(); // if body
      c.firstChild(); // :
      while(c.nextSibling()) {
        ifBody.push(traverseStmt(c, s));
      }
      c.parent();
      c.nextSibling();
      // if(s.substring(c.from, c.to) == )
      // return {
      //   tag: "if",
      //   ifCond: ifCond,
      //   ifBody: ifBody
      // }
    case "WhileStatement":
      var whileBody = [];
      c.firstChild(); // while keyword
      c.nextSibling(); // while expr
      var whileCond = traverseExpr(c, s);
      c.nextSibling(); // while body
      c.firstChild(); // :
      while(c.nextSibling()) {
        whileBody.push(traverseStmt(c, s));
      }
      c.parent();
      c.parent();
      return {
        tag: "while",
        cond: whileCond,
        body: whileBody
      }
    case "PassStatement":
      return { tag: "pass"}
    case "ReturnStatement":
      c.firstChild(); // return keyword
      var maybeRet = c.nextSibling();
      var returnExpr = undefined;
      if (maybeRet) {
        returnExpr = traverseExpr(c, s);
      }
      c.parent();
      return { tag: "return", expr: returnExpr }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr: expr }
    default:
      throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverse(c : TreeCursor, s : string) : Array<Stmt> {
  switch(c.node.type.name) {
    case "Script":
      const stmts = [];
      c.firstChild();
      do {
        stmts.push(traverseStmt(c, s));
      } while(c.nextSibling())
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
      return stmts;
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
  }
}


export function parse(source : string) : Array<Stmt> {
  const t = parser.parse(source);
  return traverse(t.cursor(), source);
}
