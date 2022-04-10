export type Parameter = {name: string, type: Type}
export enum Type {Int = "INT", Bool = "BOOL", None = "None"}
export enum BinOp {Plus = "PLUS", Minus = "MINUS", Mul = "MUL", Div = "DIV", Mod = "MOD", Equal = "EQUAL", Unequal = "UNEQUAL", Le = "LE", Ge = "GE", Lt = "LT", Gt = "GT", Is = "IS"}
export enum UniOp {Not = "NOT", Neg = "NEG"}
export type Literal = 
    { tag: "num", value: number}
    | { tag: "none"}
    | { tag: "true"}
    | { tag: "false"}


export type Stmt<A> =
    { a?: A, tag: "define", name: string, params: Array<Parameter>, ret: Type, body: Array<Stmt<A>>}
    | { a?: A, tag: "declare", name: string, type: Type, value: Expr<A>}
    | { a?: A, tag: "assign", name: string, value: Expr<A>}
    | { a?: A, tag: "if", ifCond: Expr<A>, ifBody: Array<Stmt<A>>, elif: Array<{cond: Expr<A>, body: Array<Stmt<A>>}>, elseBody: Array<Stmt<A>>}
    | { a?: A, tag: "while", cond: Expr<A>, body: Array<Stmt<A>>}
    | { a?: A, tag: "pass"}
    | { a?: A, tag: "return", value: Expr<A>}
    | { a?: A, tag: "expr", expr: Expr<A> }

export type Expr<A> =
    { a?: A, tag: "literal", value: Literal }
    | { a?: A, tag: "name", name: string}
    | { a?: A, tag: "unary", op: UniOp, expr: Expr<A>}
    | { a?: A, tag: "binary", op: BinOp, lhs: Expr<A>, rhs: Expr<A>}
    | { a?: A, tag: "call", name: string, args: Array<Expr<A>>}