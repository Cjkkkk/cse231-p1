export enum BinOp {Plus = "PLUS", Minus = "MINUS", Mul = "MUL", Div = "DIV", Mod = "MOD", Equal = "EQUAL", Unequal = "UNEQUAL", Le = "LE", Ge = "GE", Lt = "LT", Gt = "GT", Is = "IS"}
export enum UniOp {Not = "NOT", Neg = "NEG"}
export enum Primitive {Int = "INT", Bool = "BOOL", None = "None"}
export enum Const {None = "none", True = "true", False = "false"}

export type Type = Primitive | {tag: "object", class: string}
export type Literal = Const | { tag: "num", value: number}
export type TypeDef = {name: string, type: Type}
export type CondBody<A> = {cond: Expr<A>, body: Stmt<A>[]}

export type FuncStmt<A> = { a?: A, tag: "func", name: string, params: TypeDef[], ret: Type, body: Stmt<A>[]}
export type VarStmt<A> = { a?: A, tag: "var", var: TypeDef, value: Expr<A>}
export type IfStmt<A> = { a?: A, tag: "if", if: CondBody<A>, elif: CondBody<A>[], else: Stmt<A>[]}
export type AssignStmt<A> = { a?: A, tag: "assign", name: string, value: Expr<A>}
export type WhileStatement<A> = { a?: A, tag: "while", while: CondBody<A>}
export type PassStmt<A> = { a?: A, tag: "pass"}
export type ReturnStmt<A> = { a?: A, tag: "return", value: Expr<A>}
export type ExprStmt<A> = { a?: A, tag: "expr", expr: Expr<A> }
export type ClassStmt<A> = { a?: A, tag: "class", name: string, methods: FuncStmt<A>[], fields: VarStmt<A>[]}

export type LiteralExpr<A> = { a?: A, tag: "literal", value: Literal } 
export type NameExpr<A> = { a?: A, tag: "name", name: string}
export type UnaryExpr<A> = { a?: A, tag: "unary", op: UniOp, expr: Expr<A>}
export type BinaryExpr<A> = { a?: A, tag: "binary", op: BinOp, lhs: Expr<A>, rhs: Expr<A>}
export type CallExpr<A> = { a?: A, tag: "call", name: string, args: Expr<A>[]}
export type GetFieldExpr<A> = { a?: A, tag: "getfield", obj: Expr<A>, name: string}

export type Stmt<A> =
    FuncStmt<A>
    | VarStmt<A>
    | AssignStmt<A>
    | IfStmt<A>
    | WhileStatement<A>
    | PassStmt<A>
    | ReturnStmt<A>
    | ExprStmt<A>
    | ClassStmt<A>

export type Expr<A> =
    | LiteralExpr<A>
    | NameExpr<A>
    | UnaryExpr<A>
    | BinaryExpr<A>
    | CallExpr<A>
    | GetFieldExpr<A>