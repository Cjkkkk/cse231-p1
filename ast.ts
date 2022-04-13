export type TypeDef = {name: string, type: Type}
export enum Type {Int = "INT", Bool = "BOOL", None = "None"}
export enum BinOp {Plus = "PLUS", Minus = "MINUS", Mul = "MUL", Div = "DIV", Mod = "MOD", Equal = "EQUAL", Unequal = "UNEQUAL", Le = "LE", Ge = "GE", Lt = "LT", Gt = "GT", Is = "IS"}
export enum UniOp {Not = "NOT", Neg = "NEG"}
export type Literal = 
    { tag: "num", value: number}
    | { tag: "none"}
    | { tag: "true"}
    | { tag: "false"}


export type CondBody<A> = {cond: Expr<A>, body: Stmt<A>[]}

export type Stmt<A> =
    { a?: A, tag: "func", name: string, params:TypeDef[], ret: Type, body: Stmt<A>[]}
    | { a?: A, tag: "assign", var: TypeDef, value: Expr<A>}
    | { a?: A, tag: "if", if: CondBody<A>, elif: CondBody<A>[], else: Stmt<A>[]}
    | { a?: A, tag: "while", while: CondBody<A>}
    | { a?: A, tag: "pass"}
    | { a?: A, tag: "return", value: Expr<A>}
    | { a?: A, tag: "expr", expr: Expr<A> }

export type Expr<A> =
    { a?: A, tag: "literal", value: Literal }
    | { a?: A, tag: "name", name: string}
    | { a?: A, tag: "unary", op: UniOp, expr: Expr<A>}
    | { a?: A, tag: "binary", op: BinOp, lhs: Expr<A>, rhs: Expr<A>}
    | { a?: A, tag: "call", name: string, args: Expr<A>[]}