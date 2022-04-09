import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import { stringifyTree } from "./treeprinter";

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
if a > 1:
    a = 1
    a= 2
elif a > 1:
    a = 1
    a= 2
elif a > 1:
    a = 1
    a= 2
else:
    a = 1
`
const t = parser.parse(source);
console.log(stringifyTree(t.cursor(), source, 0));
console.log(1)