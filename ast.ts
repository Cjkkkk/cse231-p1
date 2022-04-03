
export type Stmt =
  | { tag: "define", name: string, value: Expr }
  | { tag: "expr", expr: Expr }

export type Expr =
    { tag: "num", value: number }
  | { tag: "id", name: string }
  | { tag: "binary", op: string, left: Expr, right: Expr }
  | { tag: "builtin1", name: string, arg: Expr }
  | { tag: "builtin2", name: string, arg1: Expr, arg2: Expr}


export type Op = 
    { tag: "add"}
  | { tag: "minus"}
  | { tag: "multiply"}

export type builtin1 = 
    { tag: "print"}
  | { tag: "abs"}

export type builtin2 = 
  { tag: "max"}
  | { tag: "min"}
  | { tag: "pow"}