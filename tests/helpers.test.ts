import { importObject } from "./import-object.test";
import { compile, run as runT} from '../compiler';
import { parse } from "../parser";
import { tcProgram } from "../tc";



// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
    const stmts = parse(source);
    const types = tcProgram(stmts);
    const lastType = types[types.length - 1].a;
    if (lastType === "int" || lastType === "bool" || lastType === "none") return lastType;
    else {
        return {tag: "object", class: lastType};
    }
}

// Modify run to use `importObject` (imported above) to use for printing
export async function run(source: string) {
    const wasmSource = compile(source);
    const v = await runT(wasmSource, importObject);
    return v;
}

type Type =
  | "int"
  | "bool"
  | "none"
  | { tag: "object", class: string }

export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "none";
export function CLASS(name : string) : Type { 
    return { tag: "object", class: name }
};
