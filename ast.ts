export type Parameter = {name: string, type: Type}

export type Stmt =
    { tag: "define", name: string, args: Array<Parameter>, ret: Type, body: Array<Stmt>}
  | { tag: "assign", name: string, value: Expr}
  | { tag: "if", ifCond: Expr, ifBody: Array<Stmt>, elif: Array<{cond: Expr, body: Array<Stmt>}>, elseBody: Array<Stmt>}
  | { tag: "while", cond: Expr, body: Array<Stmt>}
  | { tag: "pass"}
  | { tag: "return", expr: Expr}
  | { tag: "expr", expr: Expr }

export type Literal = 
    { tag: "num", value: number}
  | { tag: "none"}
  | { tag: "true"}
  | { tag: "false"}

export type Expr =
    { tag: "literal", value: Literal }
  | { tag: "name", name: string}
  | { tag: "unary", op: UniOp, expr: Expr}
  | { tag: "binary", op: BinOp, lhs: Expr, rhs: Expr}
  | { tag: "call", name: string, args: Array<Expr>}


export enum Type {Int = "INT", Bool = "BOOL"}
export enum BinOp {Plus = "PLUS", Minus = "MINUS", Mul = "MUL", Div = "DIV", Mod = "MOD", Equal = "EQUAL", Unequal = "UNEQUAL", Le = "LE", Ge = "GE", Lt = "LT", Gt = "GT", Is = "IS"}
export enum UniOp {Not = "NOT", Neg = "NEG"}