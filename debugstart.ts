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
if a1 > 1:
    a2 = 2
    a3 = 3
elif a4 > 4:
    a5 = 5
    a6 = 6
elif a7 > 7:
    a8 = 8
    a9 = 9
else:
    a10 = 10
`
const t = parser.parse(source);
console.log(stringifyTree(t.cursor(), source, 0));
console.log(1)


const stmts = parse(source);

console.log(stmts)