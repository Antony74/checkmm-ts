// Metamath database verifier
// Antony Bartlett (akb@akb.me.uk)
//
// I release this code to the public domain under the
// Creative Commons "CC0 1.0 Universal" Public Domain Dedication:
//
// http://creativecommons.org/publicdomain/zero/1.0/
//
// This is a port to TypeScript.  The original C++ program was
// written by Eric Schmidt and can be found here:
// http://us.metamath.org/other.html#checkmm
//
// This is a standalone verifier for Metamath database files.
// Run it with a single file name as the parameter.
//
// Some notes:
//
// The code assumes that the character set is compatible with ASCII.
//
// According to the spec, file inclusion commands should not include a file
// that has already been included. Unfortunately, determing whether two
// different strings refer to the same file is not easy, and, worse, is
// system-dependant. This program ignores the issue entirely and assumes
// that distinct strings name different files. This should be adequate for
// the present, at least.
//
// If the verifier finds an error, it will report it and quit. It will not
// attempt to recover and find more errors. The only condition that generates
// a diagnostic message but doesn't halt the program is an incomplete proof,
// specified by a question mark. In that case, as per the spec, a warning is
// issued and checking continues.
//
// Please let me know of any bugs.
// https://github.com/Antony74/checkmm-ts/issues

import path from 'path';
import stdModuleImport, { Deque, istream, Pair, Stack, Std } from './std';
import { createTokenArray as createTokenArrayImport, Tokens } from './tokens';

let std: Std = stdModuleImport;
let createTokenArray = createTokenArrayImport;

// Restrict ScopeArray to just the Array functionality we actually use.
// This has no effect, but should make an alternative implmentation a little
// easier to write if we ever want to pass in something besides an array.
type ScopeArray = ArrayLike<Scope> &
    Pick<Array<Scope>, 'pop' | 'push' | 'slice'> & {
        [Symbol.iterator](): IterableIterator<Scope>;
    };

let tokens: Tokens = createTokenArray();

let constants = new Set<string>();

export type Expression = Array<string>;

// The first parameter is the statement of the hypothesis, the second is
// true iff the hypothesis is floating.
export type Hypothesis = Pair<Expression, boolean>;

let hypotheses = new Map<string, Hypothesis>();

let variables = new Set<string>();

// An axiom or a theorem.
export class Assertion {
    // Hypotheses of this axiom or theorem.
    hypotheses: Deque<string> = [];
    disjvars: Set<Pair<string, string>> = new Set<Pair<string, string>>();
    // Statement of axiom or theorem.
    expression: Expression = [];
}

let assertions = new Map<string, Assertion>();

export class Scope {
    activevariables: Set<string> = new Set();
    // Labels of active hypotheses
    activehyp: string[] = [];
    disjvars: Set<string>[] = [];
    // Map from variable to label of active floating hypothesis
    floatinghyp: Map<string, string> = new Map();
}

let scopes: ScopeArray = new Array<Scope>();

// Determine if a string is used as a label
let labelused = (label: string): boolean => {
    return hypotheses.get(label) !== undefined || assertions.get(label) !== undefined;
};

// Find active floating hypothesis corresponding to variable, or empty string
// if there isn't one.
let getfloatinghyp = (vari: string): string => {
    for (const scope of scopes) {
        const loc = scope.floatinghyp.get(vari);
        if (loc !== undefined) return loc;
    }

    return '';
};

// Determine if a string is an active variable.
let isactivevariable = (str: string): boolean => {
    for (const scope of scopes) {
        if (scope.activevariables.has(str)) return true;
    }
    return false;
};

// Determine if a string is the label of an active hypothesis.
let isactivehyp = (str: string): boolean => {
    for (const scope of scopes) {
        if (scope.activehyp.find(_str => str === _str)) return true;
    }
    return false;
};

// Determine if there is an active disjoint variable restriction on
// two different variables.
let isdvr = (var1: string, var2: string): boolean => {
    if (var1 === var2) return false;
    for (const scope of scopes) {
        for (const disjvar of scope.disjvars) {
            if (disjvar.has(var1) && disjvar.has(var2)) return true;
        }
    }
    return false;
};

// Determine if a character is white space in Metamath.
let ismmws = (ch: string): boolean => {
    // This doesn't include \v ("vertical tab"), as the spec omits it.
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\f' || ch === '\r';
};

// Determine if a token is a label token.
let islabeltoken = (token: string): boolean => {
    for (const ch of token) {
        if (!(std.isalnum(ch) || ch === '.' || ch === '-' || ch === '_')) return false;
    }
    return true;
};

// Determine if a token is a math symbol token.
let ismathsymboltoken = (token: string): boolean => {
    return !token.includes('$');
};

// Determine if a token consists solely of upper-case letters or question marks
let containsonlyupperorq = (token: string): boolean => {
    for (const ch of token) {
        if (!std.isupper(ch) && ch !== '?') return false;
    }
    return true;
};

let nexttoken = (input: istream): string => {
    let ch: string;
    let token = '';

    // Skip whitespace
    while (!!(ch = input.get()) && ismmws(ch)) {}
    if (input.good()) input.unget();

    // Get token
    while (!!(ch = input.get()) && !ismmws(ch)) {
        if (ch < '!' || ch > '~') {
            throw new Error('Invalid character read with code 0x' + ch.charCodeAt(0).toString(16));
        }

        token += ch;
    }

    return token;
};

const mmfilenames = new Set<string>();

let readtokens = async (filename: string): Promise<void> => {
    const alreadyencountered: boolean = mmfilenames.has(filename);
    if (alreadyencountered) return;

    mmfilenames.add(filename);

    let instream: istream | undefined = undefined;

    try {
        instream = await std.ifstream(filename);
    } catch (_e) {}

    if (!instream) {
        throw new Error('Could not open ' + filename);
    }

    let incomment = false;
    let infileinclusion = false;
    let newfilename = '';

    let token: string;
    while ((token = nexttoken(instream)).length) {
        if (incomment) {
            if (token === '$)') {
                incomment = false;
                continue;
            }
            if (token.includes('$(')) {
                throw new Error('Characters $( found in a comment');
            }
            if (token.includes('$)')) {
                throw new Error('Characters $) found in a comment');
            }
            continue;
        }

        // Not in comment
        if (token === '$(') {
            incomment = true;
            continue;
        }

        if (infileinclusion) {
            if (!newfilename.length) {
                if (token.includes('$')) {
                    throw new Error('Filename ' + token + ' contains a $');
                }
                if (path) {
                    newfilename = path.normalize(path.join(path.dirname(filename), token));
                } else {
                    newfilename = token;
                }
                continue;
            } else {
                if (token !== '$]') {
                    throw new Error("Didn't find closing file inclusion delimiter");
                }

                await readtokens(newfilename);
                infileinclusion = false;
                newfilename = '';
                continue;
            }
        }

        if (token === '$[') {
            infileinclusion = true;
            continue;
        }

        tokens.push(token);
    }

    if (!instream.eof()) {
        throw new Error('Error reading from ' + filename);
    }

    if (incomment) {
        throw new Error('Unclosed comment');
    }

    if (infileinclusion) {
        throw new Error('Unfinished file inclusion command');
    }
};

// Construct an Assertion from an Expression. That is, determine the
// mandatory hypotheses and disjoint variable restrictions.
// The Assertion is inserted into the assertions collection,
// and is returned by reference.
let constructassertion = (label: string, exp: Expression): Assertion => {
    const assertion: Assertion = new Assertion();
    assertions.set(label, assertion);

    assertion.expression = exp;

    const varsused: Set<string> = new Set<string>();

    // Determine variables used and find mandatory hypotheses

    for (const e of exp) {
        if (variables.has(e)) varsused.add(e);
    }

    for (const scope of scopes.slice().reverse()) {
        const hypvec = scope.activehyp;
        for (const item2 of hypvec.slice().reverse()) {
            const hyp = hypotheses.get(item2)!;
            if (hyp.second && varsused.has(hyp.first[1])) {
                // Mandatory floating hypothesis
                assertion.hypotheses.unshift(item2);
            } else if (!hyp.second) {
                // Essential hypothesis
                assertion.hypotheses.unshift(item2);
                for (const item3 of hyp.first) {
                    if (variables.has(item3)) varsused.add(item3);
                }
            }
        }
    }

    // Determine mandatory disjoint variable restrictions
    for (const scope of scopes) {
        const disjvars: Set<string>[] = scope.disjvars;
        for (const item2 of disjvars) {
            const dset = Array.from(std.set_intersection(item2, varsused));

            for (let index = 0; index < dset.length; ++index) {
                for (let index2 = index + 1; index2 < dset.length; ++index2) {
                    assertion.disjvars.add({ first: dset[index], second: dset[index2] });
                }
            }
        }
    }

    return assertion;
};

// Read an expression from the token stream. Returns true iff okay.
let readexpression = (stattype: string, label: string, terminator: string): Expression => {
    if (tokens.empty()) {
        throw new Error('Unfinished $' + stattype + ' statement ' + label);
    }

    const type = tokens.front();

    if (!constants.has(type)) {
        throw new Error(
            'First symbol in $' + stattype + ' statement ' + label + ' is ' + type + ' which is not a constant',
        );
    }

    tokens.pop();

    const exp: Expression = [type];

    let token: string;

    while (!tokens.empty() && (token = tokens.front()) !== terminator) {
        tokens.pop();

        if (!constants.has(token) && !getfloatinghyp(token).length) {
            throw new Error(
                'In $' +
                    stattype +
                    ' statement ' +
                    label +
                    ' token ' +
                    token +
                    ' found which is not a constant or variable in an' +
                    ' active $f statement',
            );
        }

        exp.push(token);
    }

    if (tokens.empty()) {
        throw new Error('Unfinished $' + stattype + ' statement ' + label);
    }

    tokens.pop(); // Discard terminator token

    return exp;
};

// Make a substitution of variables. The result is put in "destination",
// which should be empty.
let makesubstitution = (original: Expression, substmap: Map<string, Expression>): Expression => {
    let destination: Expression = [];
    for (const item of original) {
        const item2 = substmap.get(item);
        if (!item2) {
            // Constant
            destination.push(item);
        } else {
            // Variable
            destination = [...destination, ...item2];
        }
    }
    return destination;
};

// Get the raw numbers from compressed proof format.
// The letter Z is translated as 0.
let getproofnumbers = (label: string, proof: string): number[] => {
    const proofnumbers: number[] = [];
    let num = 0;
    let justgotnum = false;
    for (const item of proof) {
        if (item <= 'T') {
            const addval: number = item.charCodeAt(0) - ('A'.charCodeAt(0) - 1);

            if (num > Number.MAX_SAFE_INTEGER / 20 || 20 * num > Number.MAX_SAFE_INTEGER - addval) {
                throw new Error('Overflow computing numbers in compressed proof of ' + label);
            }

            proofnumbers.push(20 * num + addval);
            num = 0;
            justgotnum = true;
        } else if (item <= 'Y') {
            const addval: number = item.charCodeAt(0) - 'T'.charCodeAt(0);

            if (num > Number.MAX_SAFE_INTEGER / 5 || 5 * num > Number.MAX_SAFE_INTEGER - addval) {
                throw new Error('Overflow computing numbers in compressed proof of ' + label);
            }

            num = 5 * num + addval;
            justgotnum = false;
        } // It must be Z
        else {
            if (!justgotnum) {
                throw new Error('Stray Z found in compressed proof of ' + label);
            }

            proofnumbers.push(0);
            justgotnum = false;
        }
    }

    if (num !== 0) {
        throw new Error('Compressed proof of theorem ' + label + ' ends in unfinished number');
    }

    return proofnumbers;
};

// Subroutine for proof verification. Verify a proof step referencing an
// assertion (i.e., not a hypothesis).
let verifyassertionref = (thlabel: string, reflabel: string, stack: Stack<Expression>): Stack<Expression> => {
    const assertion = assertions.get(reflabel)!;
    if (stack.size() < assertion.hypotheses.length) {
        throw new Error('In proof of theorem ' + thlabel + ' not enough items found on stack');
    }

    const base = stack.size() - assertion.hypotheses.length;

    const substitutions = new Map<string, Expression>();

    // Determine substitutions and check that we can unify

    for (let i = 0; i < assertion.hypotheses.length; ++i) {
        const hypothesis: Hypothesis = hypotheses.get(assertion.hypotheses[i])!;
        if (hypothesis.second) {
            // Floating hypothesis of the referenced assertion
            if (hypothesis.first[0] !== stack.at(base + i)[0]) {
                throw new Error('In proof of theorem ' + thlabel + ' unification failed');
            }
            const subst: Expression = stack.at(base + i).slice(1);
            substitutions.set(hypothesis.first[1], subst);
        } else {
            // Essential hypothesis
            const dest = makesubstitution(hypothesis.first, substitutions);
            if (!std.arraysequal(dest, stack.at(base + i))) {
                throw new Error('In proof of theorem ' + thlabel + ' unification failed');
            }
        }
    }

    // Remove hypotheses from stack
    stack.truncate(base);

    // Verify disjoint variable conditions
    for (const item of assertion.disjvars) {
        const exp1: Expression = substitutions.get(item.first)!;
        const exp2: Expression = substitutions.get(item.second)!;

        const exp1vars = new Set<string>();
        for (const exp1item of exp1) {
            if (variables.has(exp1item)) exp1vars.add(exp1item);
        }

        const exp2vars = new Set<string>();
        for (const exp2item of exp2) {
            if (variables.has(exp2item)) exp2vars.add(exp2item);
        }

        for (const exp1item of exp1vars) {
            for (const exp2item of exp2vars) {
                if (!isdvr(exp1item, exp2item)) {
                    throw new Error('In proof of theorem ' + thlabel + ' disjoint variable restriction violated');
                }
            }
        }
    }

    // Done verification of this step. Insert new statement onto stack.
    const dest: Expression = makesubstitution(assertion.expression, substitutions);
    stack.push(dest);

    return stack;
};

// Verify a regular proof. The "proof" argument should be a non-empty sequence
// of valid labels. Return true iff the proof is correct.
let verifyregularproof = (label: string, theorem: Assertion, proof: string[]): void => {
    let stack: Stack<Expression> = std.createstack();

    for (const proofstep of proof) {
        // If step is a hypothesis, just push it onto the stack.
        const hyp = hypotheses.get(proofstep);
        if (hyp) {
            stack.push(hyp.first);
            continue;
        }

        // It must be an axiom or theorem
        stack = verifyassertionref(label, proofstep, stack);
    }

    if (stack.size() !== 1) {
        throw new Error('Proof of theorem ' + label + ' does not end with only one item on the stack');
    }

    if (!std.arraysequal(stack.at(0), theorem.expression)) {
        throw new Error('Proof of theorem ' + label + ' proves wrong statement');
    }
};

// Verify a compressed proof
let verifycompressedproof = (label: string, theorem: Assertion, labels: string[], proofnumbers: number[]): void => {
    let stack: Stack<Expression> = std.createstack();

    const mandhypt: number = theorem.hypotheses.length;
    const labelt: number = mandhypt + labels.length;

    const savedsteps: Expression[] = [];
    for (const item of proofnumbers) {
        // Save the last proof step if 0
        if (item === 0) {
            savedsteps.push(stack.top());
            continue;
        }

        // If step is a mandatory hypothesis, just push it onto the stack.
        if (item <= mandhypt) {
            stack.push(hypotheses.get(theorem.hypotheses[item - 1])!.first);
        } else if (item <= labelt) {
            const proofstep: string = labels[item - mandhypt - 1];

            // If step is a (non-mandatory) hypothesis,
            // just push it onto the stack.
            const hyp: Hypothesis = hypotheses.get(proofstep)!;
            if (hyp) {
                stack.push(hyp.first);
                continue;
            }

            // It must be an axiom or theorem
            stack = verifyassertionref(label, proofstep, stack);
        } // Must refer to saved step
        else {
            if (item > labelt + savedsteps.length) {
                throw new Error('Number in compressed proof of ' + label + ' is too high');
            }

            stack.push(savedsteps[item - labelt - 1]);
        }
    }

    if (stack.size() !== 1) {
        throw new Error('Proof of theorem ' + label + ' does not end with only one item on the stack');
    }

    if (!std.arraysequal(stack.at(0), theorem.expression)) {
        throw new Error('Proof of theorem ' + label + ' proves wrong statement');
    }
};

// Parse $p statement. Return true iff okay.
let parsep = (label: string): void => {
    const newtheorem: Expression = readexpression('p', label, '$=');

    const assertion: Assertion = constructassertion(label, newtheorem);

    // Now for the proof

    if (tokens.empty()) {
        throw new Error('Unfinished $p statement ' + label);
    }

    if (tokens.front() === '(') {
        // Compressed proof
        tokens.pop();

        // Get labels

        const labels: string[] = [];
        let token: string;

        while (!tokens.empty() && (token = tokens.front()) !== ')') {
            tokens.pop();
            labels.push(token);
            if (token === label) {
                throw new Error('Proof of theorem ' + label + ' refers to itself');
            } else if (assertion.hypotheses.find(_token => _token === token)) {
                throw new Error(
                    'Compressed proof of theorem ' + label + ' has mandatory hypothesis ' + token + ' in label list',
                );
            } else if (!assertions.has(token) && !isactivehyp(token)) {
                throw new Error(
                    'Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement',
                );
            }
        }

        if (tokens.empty()) {
            throw new Error('Unfinished $p statement ' + label);
        }

        tokens.pop(); // Discard ) token

        // Get proof steps

        let proof = '';
        while (!tokens.empty() && (token = tokens.front()) !== '$.') {
            tokens.pop();

            proof += token;
            if (!containsonlyupperorq(token)) {
                throw new Error('Bogus character found in compressed proof of ' + label);
            }
        }

        if (tokens.empty()) {
            throw new Error('Unfinished $p statement ' + label);
        }

        if (!proof.length) {
            throw new Error('Theorem ' + label + ' has no proof');
        }

        tokens.pop(); // Discard $. token

        if (proof.includes('?')) {
            console.error('Warning: Proof of theorem ' + label + ' is incomplete');
            return; // Continue processing file
        }

        const proofnumbers: number[] = getproofnumbers(label, proof);

        verifycompressedproof(label, assertion, labels, proofnumbers);
    } else {
        // Regular (uncompressed proof)
        const proof: string[] = [];
        let incomplete = false;
        let token: string;
        while (!tokens.empty() && (token = tokens.front()) !== '$.') {
            tokens.pop();
            proof.push(token);
            if (token === '?') incomplete = true;
            else if (token === label) {
                throw new Error('Proof of theorem ' + label + ' refers to itself');
            } else if (!assertions.has(token) && !isactivehyp(token)) {
                throw new Error(
                    'Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement',
                );
            }
        }

        if (tokens.empty()) {
            throw new Error('Unfinished $p statement ' + label);
        }

        if (!proof.length) {
            throw new Error('Theorem ' + label + ' has no proof');
        }

        tokens.pop(); // Discard $. token

        if (incomplete) {
            throw new Error('Warning: Proof of theorem ' + label + ' is incomplete');
        }

        verifyregularproof(label, assertion, proof);
    }
};

// Parse $e statement. Return true iff okay.
let parsee = (label: string): void => {
    const newhyp: Expression = readexpression('e', label, '$.');

    // Create new essential hypothesis
    hypotheses.set(label, { first: newhyp, second: false });
    scopes[scopes.length - 1].activehyp.push(label);
};

// Parse $a statement. Return true iff okay.
let parsea = (label: string): void => {
    const newaxiom = readexpression('a', label, '$.');
    constructassertion(label, newaxiom);
};

// Parse $f statement. Return true iff okay.
let parsef = (label: string): void => {
    if (tokens.empty()) {
        throw new Error('Unfinished $f statement' + label);
    }

    const typeToken = tokens.front();

    if (!constants.has(typeToken)) {
        throw new Error('First symbol in $f statement ' + label + ' is ' + typeToken + ' which is not a constant');
    }

    tokens.pop();

    if (tokens.empty()) {
        throw new Error('Unfinished $f statement ' + label);
    }

    const variable = tokens.front();
    if (!isactivevariable(variable)) {
        throw new Error(
            'Second symbol in $f statement ' + label + ' is ' + variable + ' which is not an active variable',
        );
    }
    if (getfloatinghyp(variable).length) {
        throw new Error('The variable ' + variable + ' appears in a second $f statement ' + label);
    }

    tokens.pop();

    if (tokens.empty()) {
        throw new Error('Unfinished $f statement' + label);
    }

    if (tokens.front() !== '$.') {
        throw new Error('Expected end of $f statement ' + label + ' but found ' + tokens.front());
    }

    tokens.pop(); // Discard $. token

    // Create new floating hypothesis
    const newhyp: Expression = [];
    newhyp.push(typeToken);
    newhyp.push(variable);
    hypotheses.set(label, { first: newhyp, second: true });
    scopes[scopes.length - 1].activehyp.push(label);
    scopes[scopes.length - 1].floatinghyp.set(variable, label);
};

// Parse labeled statement. Return true iff okay.
let parselabel = (label: string): void => {
    if (constants.has(label)) {
        throw new Error('Attempt to reuse constant ' + label + ' as a label');
    }

    if (variables.has(label)) {
        throw new Error('Attempt to reuse variable ' + label + ' as a label');
    }

    if (labelused(label)) {
        throw new Error('Attempt to reuse label ' + label);
    }

    if (tokens.empty()) {
        throw new Error('Unfinished labeled statement');
    }

    const typeToken = tokens.pop();

    if (typeToken === '$p') {
        parsep(label);
    } else if (typeToken === '$e') {
        parsee(label);
    } else if (typeToken === '$a') {
        parsea(label);
    } else if (typeToken === '$f') {
        parsef(label);
    } else {
        throw new Error('Unexpected token ' + typeToken + ' encountered');
    }
};

// Parse $d statement. Return true iff okay.
let parsed = (): void => {
    const dvars = new Set<string>();
    let token: string;

    while (!tokens.empty() && (token = tokens.front()) !== '$.') {
        tokens.pop();

        if (!isactivevariable(token)) {
            throw new Error('Token ' + token + ' is not an active variable, ' + 'but was found in a $d statement');
        }

        if (dvars.has(token)) {
            throw new Error('$d statement mentions ' + token + ' twice');
        }

        dvars.add(token);
    }

    if (tokens.empty()) {
        throw new Error('Unterminated $d statement');
    }

    if (dvars.size < 2) {
        throw new Error('Not enough items in $d statement');
    }

    // Record it
    scopes[scopes.length - 1].disjvars.push(dvars);

    tokens.pop(); // Discard $. token
};

// Parse $c statement. Return true iff okay.
let parsec = (): void => {
    if (scopes.length > 1) {
        throw new Error('$c statement occurs in inner block');
    }

    let token: string;
    let listempty = true;
    while (!tokens.empty() && (token = tokens.front()) !== '$.') {
        tokens.pop();
        listempty = false;

        if (!ismathsymboltoken(token)) {
            throw new Error('Attempt to declare ' + token + ' as a constant');
        }
        if (variables.has(token)) {
            throw new Error('Attempt to redeclare variable ' + token + ' as a constant');
        }
        if (labelused(token)) {
            throw new Error('Attempt to reuse label ' + token + ' as a constant');
        }
        if (constants.has(token)) {
            throw new Error('Attempt to redeclare constant ' + token);
        }
        constants.add(token);
    }

    if (tokens.empty()) {
        throw new Error('Unterminated $c statement');
    }

    if (listempty) {
        throw new Error('Empty $c statement');
    }

    tokens.pop(); // Discard $. token
};

// Parse $v statement. Return true iff okay.
let parsev = (): void => {
    let token: string;
    let listempty = true;
    while (!tokens.empty() && (token = tokens.front()) !== '$.') {
        tokens.pop();
        listempty = false;

        if (!ismathsymboltoken(token)) {
            throw new Error('Attempt to declare ' + token + ' as a variable');
        }
        if (constants.has(token)) {
            throw new Error('Attempt to redeclare constant ' + token + ' as a variable');
        }
        if (labelused(token)) {
            throw new Error('Attempt to reuse label ' + token + ' as a variable');
        }
        const alreadyactive: boolean = isactivevariable(token);
        if (alreadyactive) {
            throw new Error('Attempt to redeclare active variable ' + token);
        }
        variables.add(token);
        scopes[scopes.length - 1].activevariables.add(token);
    }

    if (tokens.empty()) {
        throw new Error('Unterminated $v statement');
    }

    if (listempty) {
        throw new Error('Empty $v statement');
    }

    tokens.pop(); // Discard $. token
};

const EXIT_FAILURE = 1;

let main = async (argv: string[]): Promise<number> => {
    try {
        if (argv.length !== 2) {
            console.error('Syntax: checkmm <filename>');
            return EXIT_FAILURE;
        }

        await readtokens(argv[1]);

        // Reverse the order of the tokens.  We do this O(n) operation just
        // once here so that the tokens were added with 'push' O(1) but
        // can be removed with 'pop' O(1) in the order they were added (first
        // in first out).  It's completely impractical to use 'shift' or 'unshift'
        // because they're O(n) operations.
        tokens.reverse();

        scopes.push(new Scope());

        while (!tokens.empty()) {
            const token = tokens.pop()!;

            if (islabeltoken(token)) {
                parselabel(token);
            } else if (token === '$d') {
                parsed();
            } else if (token === '${') {
                scopes.push(new Scope());
            } else if (token === '$}') {
                scopes.pop();
                if (!scopes.length) {
                    throw new Error('$} without corresponding ${');
                }
            } else if (token === '$c') {
                parsec();
            } else if (token === '$v') {
                parsev();
            } else {
                throw new Error('Unexpected token ' + token + ' encountered');
            }
        }

        if (scopes.length > 1) {
            throw new Error('${ without corresponding $}');
        }

        return 0;
    } catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error(err);
        }
        return EXIT_FAILURE;
    }
};

// Are we being run as a cli program or a library?
if (process) {
    const executedScript = process.argv.length >= 2 ? process.argv[1] : '';
    const validCliSuffices = [
        __filename,
        '/.bin/checkmm',
        '/bin/checkmm',
        '/cli.js',
        '\\.bin\\checkmm',
        '\\bin\\checkmm',
        '\\cli.js',
    ];

    const isCliCommand = validCliSuffices.reduce(
        (acc, suffix) => (acc ? acc : executedScript.slice(-suffix.length) === suffix),
        false,
    );

    if (isCliCommand) {
        // We are being run as a cli program
        main(process.argv.slice(1)).then(exitCode => {
            process.exitCode = exitCode;
        });
    }
}

export default {
    get std() {
        return std;
    },
    set std(_std: Std) {
        std = _std;
    },
    get createTokenArray() {
        return createTokenArray;
    },
    set createTokenArray(_createTokenArray: () => Tokens) {
        createTokenArray = _createTokenArray;
    },
    get tokens() {
        return tokens;
    },
    set tokens(_tokens: Tokens) {
        tokens = _tokens;
    },
    get constants() {
        return constants;
    },
    set constants(_constants: Set<string>) {
        constants = _constants;
    },
    get hypotheses() {
        return hypotheses;
    },
    set hypotheses(_hypotheses: Map<string, Hypothesis>) {
        hypotheses = _hypotheses;
    },
    get variables() {
        return variables;
    },
    set variables(_variables: Set<string>) {
        variables = _variables;
    },
    get assertions() {
        return assertions;
    },
    set assertions(_assertions: Map<string, Assertion>) {
        assertions = _assertions;
    },
    get scopes() {
        return scopes;
    },
    set scopes(_scopes: ScopeArray) {
        scopes = _scopes;
    },
    get labelused() {
        return labelused;
    },
    set labelused(_labelused: (label: string) => boolean) {
        labelused = _labelused;
    },
    get getfloatinghyp() {
        return getfloatinghyp;
    },
    set getfloatinghyp(_getfloatinghyp: (vari: string) => string) {
        getfloatinghyp = _getfloatinghyp;
    },
    get isactivevariable() {
        return isactivevariable;
    },
    set isactivevariable(_isactivevariable: (str: string) => boolean) {
        isactivevariable = _isactivevariable;
    },
    get isactivehyp() {
        return isactivehyp;
    },
    set isactivehyp(_isactivehyp: (str: string) => boolean) {
        isactivehyp = _isactivehyp;
    },
    get isdvr() {
        return isdvr;
    },
    set isdvr(_isdvr: (var1: string, var2: string) => boolean) {
        isdvr = _isdvr;
    },
    get ismmws() {
        return ismmws;
    },
    set ismmws(_ismmws: (ch: string) => boolean) {
        ismmws = _ismmws;
    },
    get islabeltoken() {
        return islabeltoken;
    },
    set islabeltoken(_islabeltoken: (token: string) => boolean) {
        islabeltoken = _islabeltoken;
    },
    get ismathsymboltoken() {
        return ismathsymboltoken;
    },
    set ismathsymboltoken(_ismathsymboltoken: (token: string) => boolean) {
        ismathsymboltoken = _ismathsymboltoken;
    },
    get containsonlyupperorq() {
        return containsonlyupperorq;
    },
    set containsonlyupperorq(_containsonlyupperorq: (token: string) => boolean) {
        containsonlyupperorq = _containsonlyupperorq;
    },
    get nexttoken() {
        return nexttoken;
    },
    set nexttoken(_nexttoken: (input: istream) => string) {
        nexttoken = _nexttoken;
    },
    get readtokens() {
        return readtokens;
    },
    set readtokens(_readtokens: (filename: string) => Promise<void>) {
        readtokens = _readtokens;
    },
    get constructassertion() {
        return constructassertion;
    },
    set constructassertion(_constructassertion: (label: string, exp: Expression) => Assertion) {
        constructassertion = _constructassertion;
    },
    get readexpression() {
        return readexpression;
    },
    set readexpression(_readexpression: (stattype: string, label: string, terminator: string) => Expression) {
        readexpression = _readexpression;
    },
    get makesubstitution() {
        return makesubstitution;
    },
    set makesubstitution(_makesubstitution: (original: Expression, substmap: Map<string, Expression>) => Expression) {
        makesubstitution = _makesubstitution;
    },
    get getproofnumbers() {
        return getproofnumbers;
    },
    set getproofnumbers(_getproofnumbers: (label: string, proof: string) => number[]) {
        getproofnumbers = _getproofnumbers;
    },
    get verifyassertionref() {
        return verifyassertionref;
    },
    set verifyassertionref(
        _verifyassertionref: (thlabel: string, reflabel: string, stack: Stack<Expression>) => Stack<Expression>,
    ) {
        verifyassertionref = _verifyassertionref;
    },
    get verifyregularproof() {
        return verifyregularproof;
    },
    set verifyregularproof(_verifyregularproof: (label: string, theorem: Assertion, proof: string[]) => void) {
        verifyregularproof = _verifyregularproof;
    },
    get verifycompressedproof() {
        return verifycompressedproof;
    },
    set verifycompressedproof(
        _verifycompressedproof: (label: string, theorem: Assertion, labels: string[], proofnumbers: number[]) => void,
    ) {
        verifycompressedproof = _verifycompressedproof;
    },
    get parsep() {
        return parsep;
    },
    set parsep(_parsep: (label: string) => void) {
        parsep = _parsep;
    },
    get parsee() {
        return parsee;
    },
    set parsee(_parsee: (label: string) => void) {
        parsee = _parsee;
    },
    get parsea() {
        return parsea;
    },
    set parsea(_parsea: (label: string) => void) {
        parsea = _parsea;
    },
    get parsef() {
        return parsef;
    },
    set parsef(_parsef: (label: string) => void) {
        parsef = _parsef;
    },
    get parselabel() {
        return parselabel;
    },
    set parselabel(_parselabel: (label: string) => void) {
        parselabel = _parselabel;
    },
    get parsed() {
        return parsed;
    },
    set parsed(_parsed: () => void) {
        parsed = _parsed;
    },
    get parsec() {
        return parsec;
    },
    set parsec(_parsec: () => void) {
        parsec = _parsec;
    },
    get parsev() {
        return parsev;
    },
    set parsev(_parsev: () => void) {
        parsev = _parsev;
    },
    get main() {
        return main;
    },
    set main(_main: (argv: string[]) => Promise<number>) {
        main = _main;
    },
};
