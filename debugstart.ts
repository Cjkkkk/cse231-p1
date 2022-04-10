import {parser } from "lezer-python";
import { TreeCursor } from "lezer-tree";
import { stringifyTree } from "./treeprinter";
import { parse } from "./parser";

var source = `
if a > 1:
    a = 1
elif a < 1:
    a = 2
else:
    a = 3

pass
`


source = `
def f(a:int, b:int) -> int:
    a = a + b
    b = b + a
    return a
`

source = `
while a > 1:
    a = 1
    b = 2
`



source = `
if c > 10:
    c = 11
else:
    c = 22
`

source = `
x: int = 1
x = x + 1
`

source = `
def f1(b: int) -> int:
    return b * 1
`

const t = parser.parse(source);
console.log(stringifyTree(t.cursor(), source, 0));
console.log(1)


const stmts = parse(source);

console.log(stmts)

type BodyEnv = Map<string, number>;
var v = new Map<string, number>();
console.log(v.get("a"));