import { readFileSync } from 'fs';
import { compile, run } from './compiler';


if(process.argv.length != 3) {
    console.log("Usage: node node-main.js [filename]")
    process.exit(1)
}

const file = readFileSync(process.argv[2], 'utf-8');
const wasmSource = compile(file)
console.log(wasmSource);

const importObject = {
    imports: {
        print_num: (arg : any) => {
            importObject.output += arg;
            importObject.output += "\n";
            return arg;
        },
        print_bool: (arg : any) => {
            if(arg === 0) { 
                importObject.output += "False";
                importObject.output += "\n";
            }
            else { 
                importObject.output += "True";
                importObject.output += "\n";
            }
            return arg;
        },
        print_none: (arg: any) => {
            importObject.output += "None";
            importObject.output += "\n";
            return arg;
        }
    },
    output: ""
};

run(`
(module
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (global $a (mut i32) (i32.const 0))
    (global $b (mut i32) (i32.const 0))

    (func (export "_start") (result i32)
        (local $scratch i32)
        (local $b i32)
        i32.const 1
        global.set $a
        i32.const 2
        global.set $b
        global.get $a
        i32.const 100
        i32.lt_s
        (if
            (then
                i32.const 3
                global.set $b
            )
            (else
            )
        )
        global.get $b
        local.set $scratch
        local.get $scratch
    )
) `, importObject).then((v) => console.log(v))