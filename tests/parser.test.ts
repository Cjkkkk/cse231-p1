import * as mocha from 'mocha';
import {expect} from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, traverse, parse } from '../parser';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(c, s) function', () => {
    it('parses a number in the beginning', () => {
        const source = "987";
        const cursor = parser.parse(source).cursor();

        // go to statement
        cursor.firstChild();
        // go to expression
        cursor.firstChild();

        const parsedExpr = traverseExpr(cursor, source);

        // Note: we have to use deep equality when comparing objects
        expect(parsedExpr).to.deep.equal({tag: "num", value: 987});
    })

    // TODO: add additional tests here to ensure traverseExpr works as expected
});

describe('traverseStmt(c, s) function', () => {
    // TODO: add tests here to ensure traverseStmt works as expected
    it('parses a assignment in the beginning', () => {
        const source = "a = 1";
        const cursor = parser.parse(source).cursor();

        // go to statement
        cursor.firstChild();
        const parsedStmt = traverseStmt(cursor, source);

        // Note: we have to use deep equality when comparing objects
        expect(parsedStmt).to.deep.equal({ tag: "define", name: "a", value: { tag: "num", value: 1 } });
    })
});

describe('traverse(c, s) function', () => {
    // TODO: add tests here to ensure traverse works as expected
    it('parses a assignment in the beginning', () => {
        const source = "a = 1";
        const cursor = parser.parse(source).cursor();

        // go to statement
        const parsedStmts = traverse(cursor, source);

        // Note: we have to use deep equality when comparing objects
        expect(parsedStmts).to.deep.equal([{ tag: "define", name: "a", value: { tag: "num", value: 1}}]);
    })
});

describe('parse(source) function', () => {
    it('parse a number', () => {
        const parsed = parse("987");
        expect(parsed).to.deep.equal([{tag: "expr", expr: {tag: "num", value: 987}}]);
    });    

    // TODO: add additional tests here to ensure parse works as expected
});