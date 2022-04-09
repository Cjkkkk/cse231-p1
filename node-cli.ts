import { readFileSync } from 'fs';
import { compile } from './compiler';


if(process.argv.length != 3) {
    console.log("Usage: node node-repl.js [filename]")
    process.exit(1)
}

const file = readFileSync(process.argv[2], 'utf-8');
console.log(compile(file));