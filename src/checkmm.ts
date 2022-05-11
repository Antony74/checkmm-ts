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
// https://github.com/Antony74/checkmm-js/issues

import std, { createStack, Deque, istream, Pair, Queue, Stack } from './std';

let tokens = new Queue<string>();

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

let scopes: Scope[] = [];

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
        if (!(std.isalnum(ch) || ch == '.' || ch == '-' || ch == '_')) return false;
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
    let token: string = '';

    // Skip whitespace
    while (!!(ch = input.get()) && ismmws(ch)) {}
    if (input.good()) input.unget();

    // Get token
    while (!!(ch = input.get()) && !ismmws(ch)) {
        if (ch < '!' || ch > '~') {
            console.error('Invalid character read with code 0x' + ch.charCodeAt(0).toString(16));
            return '';
        }

        token += ch;
    }

    if (!input.eof() && input.fail()) return '';

    return token;
};

let mmfilenames = new Set<string>();

let readtokens = async (filename: string): Promise<boolean> => {
    const alreadyencountered: boolean = mmfilenames.has(filename);
    if (alreadyencountered) return true;

    mmfilenames.add(filename);

    const instream = await std.ifstream(filename);
    if (!instream) {
        console.error('Could not open ' + filename);
        return false;
    }

    let incomment: boolean = false;
    let infileinclusion: boolean = false;
    let newfilename: string = '';

    let token: string;
    while ((token = nexttoken(instream)).length) {
        if (incomment) {
            if (token == '$)') {
                incomment = false;
                continue;
            }
            if (token.includes('$(')) {
                console.error('Characters $( found in a comment');
                return false;
            }
            if (token.includes('$)')) {
                console.error('Characters $) found in a comment');
                return false;
            }
            continue;
        }

        // Not in comment
        if (token == '$(') {
            incomment = true;
            continue;
        }

        if (infileinclusion) {
            if (!newfilename.length) {
                if (token.includes('$')) {
                    console.error('Filename ' + token + ' contains a $');
                    return false;
                }
                newfilename = token;
                continue;
            } else {
                if (token != '$]') {
                    console.error("Didn't find closing file inclusion delimiter");
                    return false;
                }

                const okay: boolean = await readtokens(newfilename);
                if (!okay) return false;
                infileinclusion = false;
                newfilename = '';
                continue;
            }
        }

        if (token == '$[') {
            infileinclusion = true;
            continue;
        }

        tokens.push(token);
    }

    if (!instream.eof()) {
        if (instream.fail()) console.error('Error reading from ' + filename);
        return false;
    }

    if (incomment) {
        console.error('Unclosed comment');
        return false;
    }

    if (infileinclusion) {
        console.error('Unfinished file inclusion command');
        return false;
    }

    return true;
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
let readexpression = (stattype: string, label: string, terminator: string): Expression | undefined => {
    if (!tokens.length) {
        console.error('Unfinished $' + stattype + ' statement ' + label);
        return undefined;
    }

    const type = tokens.front();

    if (!constants.has(type)) {
        console.error(
            'First symbol in $' + stattype + ' statement ' + label + ' is ' + type + ' which is not a constant',
        );
        return undefined;
    }

    tokens.shift();

    const exp: Expression = [type];

    let token: string;

    while (tokens.length && (token = tokens.front()) !== terminator) {
        tokens.shift();

        if (!constants.has(token) && !getfloatinghyp(token).length) {
            console.error(
                'In $' +
                    stattype +
                    ' statement ' +
                    label +
                    ' token ' +
                    token +
                    ' found which is not a constant or variable in an' +
                    ' active $f statement',
            );
            return undefined;
        }

        exp.push(token);
    }

    if (!tokens.length) {
        console.error('Unfinished $' + stattype + ' statement ' + label);
        return undefined;
    }

    tokens.shift(); // Discard terminator token

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
let getproofnumbers = (label: string, proof: string): number[] | undefined => {
    const proofnumbers: number[] = [];
    let num = 0;
    let justgotnum: boolean = false;
    for (const item of proof) {
        if (item <= 'T') {
            const addval: number = item.charCodeAt(0) - ('A'.charCodeAt(0) - 1);

            if (num > Number.MAX_SAFE_INTEGER / 20 || 20 * num > Number.MAX_SAFE_INTEGER - addval) {
                console.error('Overflow computing numbers in compressed proof of ' + label);
                return undefined;
            }

            proofnumbers.push(20 * num + addval);
            num = 0;
            justgotnum = true;
        } else if (item <= 'Y') {
            const addval: number = item.charCodeAt(0) - 'T'.charCodeAt(0);

            if (num > Number.MAX_SAFE_INTEGER / 5 || 5 * num > Number.MAX_SAFE_INTEGER - addval) {
                console.error('Overflow computing numbers in compressed proof of ' + label);
                return undefined;
            }

            num = 5 * num + addval;
            justgotnum = false;
        } // It must be Z
        else {
            if (!justgotnum) {
                console.error('Stray Z found in compressed proof of ' + label);
                return undefined;
            }

            proofnumbers.push(0);
            justgotnum = false;
        }
    }

    if (num !== 0) {
        console.error('Compressed proof of theorem ' + label + ' ends in unfinished number');
        return undefined;
    }

    return proofnumbers;
};

// Subroutine for proof verification. Verify a proof step referencing an
// assertion (i.e., not a hypothesis).
let verifyassertionref = (
    thlabel: string,
    reflabel: string,
    stack: Stack<Expression>,
): Stack<Expression> | undefined => {
    const assertion = assertions.get(reflabel)!;
    if (stack.size() < assertion.hypotheses.length) {
        console.error('In proof of theorem ' + thlabel + ' not enough items found on stack');
        return undefined;
    }

    const base = stack.size() - assertion.hypotheses.length;

    const substitutions = new Map<string, Expression>();

    // Determine substitutions and check that we can unify

    for (let i = 0; i < assertion.hypotheses.length; ++i) {
        const hypothesis: Hypothesis = hypotheses.get(assertion.hypotheses[i])!;
        if (hypothesis.second) {
            // Floating hypothesis of the referenced assertion
            if (hypothesis.first[0] !== stack.at(base + i)[0]) {
                console.error('In proof of theorem ' + thlabel + ' unification failed');
                return undefined;
            }
            const subst: Expression = stack.at(base + i).slice(1);
            substitutions.set(hypothesis.first[1], subst);
        } else {
            // Essential hypothesis
            const dest = makesubstitution(hypothesis.first, substitutions);
            if (!std.arraysequal(dest, stack.at(base + i))) {
                console.error('In proof of theorem ' + thlabel + ' unification failed');
                return undefined;
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
                    console.error('In proof of theorem ' + thlabel + ' disjoint variable restriction violated');
                    return undefined;
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
let verifyregularproof = (label: string, theorem: Assertion, proof: string[]): boolean => {
    let stack: Stack<Expression> = std.createStack();

    for (const proofstep of proof) {
        // If step is a hypothesis, just push it onto the stack.
        const hyp = hypotheses.get(proofstep);
        if (hyp) {
            stack.push(hyp.first);
            continue;
        }

        // It must be an axiom or theorem
        stack = verifyassertionref(label, proofstep, stack)!;
        if (stack === undefined) return false;
    }

    if (stack.size() !== 1) {
        console.error('Proof of theorem ' + label + ' does not end with only one item on the stack');
        return false;
    }

    if (!std.arraysequal(stack.at(0), theorem.expression)) {
        console.error('Proof of theorem ' + label + ' proves wrong statement');
        return false;
    }

    return true;
};

// Verify a compressed proof
let verifycompressedproof = (label: string, theorem: Assertion, labels: string[], proofnumbers: number[]): boolean => {
    let stack: Stack<Expression> = createStack();

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
            stack = verifyassertionref(label, proofstep, stack)!;
            if (stack === undefined) return false;
        } // Must refer to saved step
        else {
            if (item > labelt + savedsteps.length) {
                console.error('Number in compressed proof of ' + label + ' is too high');
                return false;
            }

            stack.push(savedsteps[item - labelt - 1]);
        }
    }

    if (stack.size() !== 1) {
        console.error('Proof of theorem ' + label + ' does not end with only one item on the stack');
        return false;
    }

    if (!std.arraysequal(stack.at(0), theorem.expression)) {
        console.error('Proof of theorem ' + label + ' proves wrong statement');
        return false;
    }

    return true;
};

// Parse $p statement. Return true iff okay.
let parsep = (label: string): boolean => {
    const newtheorem: Expression = readexpression('p', label, '$=')!;

    if (!newtheorem) {
        return false;
    }

    const assertion: Assertion = constructassertion(label, newtheorem);

    // Now for the proof

    if (!tokens.length) {
        console.error('Unfinished $p statement ' + label);
        return false;
    }

    if (tokens.front() === '(') {
        // Compressed proof
        tokens.shift();

        // Get labels

        const labels: string[] = [];
        let token: string;

        while (tokens.length && (token = tokens.front()) !== ')') {
            tokens.shift();
            labels.push(token);
            if (token === label) {
                console.error('Proof of theorem ' + label + ' refers to itself');
                return false;
            } else if (assertion.hypotheses.find(_token => _token === token)) {
                console.error(
                    'Compressed proof of theorem ' + label + ' has mandatory hypothesis ' + token + ' in label list',
                );
                return false;
            } else if (!assertions.has(token) && !isactivehyp(token)) {
                console.error(
                    'Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement',
                );
                return false;
            }
        }

        if (!tokens.length) {
            console.error('Unfinished $p statement ' + label);
            return false;
        }

        tokens.shift(); // Discard ) token

        // Get proof steps

        let proof = '';
        while (tokens.length && (token = tokens.front()) !== '$.') {
            tokens.shift();

            proof += token;
            if (!containsonlyupperorq(token)) {
                console.error('Bogus character found in compressed proof of ' + label);
                return false;
            }
        }

        if (!tokens.length) {
            console.error('Unfinished $p statement ' + label);
            return false;
        }

        if (!proof.length) {
            console.error('Theorem ' + label + ' has no proof');
            return false;
        }

        tokens.shift(); // Discard $. token

        if (proof.includes('?')) {
            console.error('Warning: Proof of theorem ' + label + ' is incomplete');
            return true; // Continue processing file
        }

        const proofnumbers: number[] = getproofnumbers(label, proof)!;
        if (!proofnumbers) return false;

        const okay: boolean = verifycompressedproof(label, assertion, labels, proofnumbers);
        if (!okay) return false;
    } else {
        // Regular (uncompressed proof)
        const proof: string[] = [];
        let incomplete: boolean = false;
        let token: string;
        while (tokens.length && (token = tokens.front()) !== '$.') {
            tokens.shift();
            proof.push(token);
            if (token == '?') incomplete = true;
            else if (token == label) {
                console.error('Proof of theorem ' + label + ' refers to itself');
                return false;
            } else if (!assertions.has(token) && !isactivehyp(token)) {
                console.error(
                    'Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement',
                );
                return false;
            }
        }

        if (!tokens.length) {
            console.error('Unfinished $p statement ' + label);
            return false;
        }

        if (!proof.length) {
            console.error('Theorem ' + label + ' has no proof');
            return false;
        }

        tokens.shift(); // Discard $. token

        if (incomplete) {
            console.error('Warning: Proof of theorem ' + label + ' is incomplete');
            return true; // Continue processing file
        }

        const okay: boolean = verifyregularproof(label, assertion, proof);
        if (!okay) return false;
    }

    return true;
};

// Parse $e statement. Return true iff okay.
let parsee = (label: string): boolean => {
    const newhyp: Expression = readexpression('e', label, '$.')!;
    if (!newhyp) {
        return false;
    }

    // Create new essential hypothesis
    hypotheses.set(label, { first: newhyp, second: false });
    scopes[scopes.length - 1].activehyp.push(label);

    return true;
};

// Parse $a statement. Return true iff okay.
let parsea = (label: string): boolean => {
    const newaxiom = readexpression('a', label, '$.');
    if (!newaxiom) {
        return false;
    }

    constructassertion(label, newaxiom);

    return true;
};

// Parse $f statement. Return true iff okay.
let parsef = (label: string): boolean => {
    if (!tokens.length) {
        console.error('Unfinished $f statement' + label);
        return false;
    }

    const typeToken = tokens.front();

    if (!constants.has(typeToken)) {
        console.error('First symbol in $f statement ' + label + ' is ' + typeToken + ' which is not a constant');
        return false;
    }

    tokens.shift();

    if (!tokens.length) {
        console.error('Unfinished $f statement ' + label);
        return false;
    }

    const variable = tokens.front();
    if (!isactivevariable(variable)) {
        console.error(
            'Second symbol in $f statement ' + label + ' is ' + variable + ' which is not an active variable',
        );
        return false;
    }
    if (getfloatinghyp(variable).length) {
        console.error('The variable ' + variable + ' appears in a second $f statement ' + label);
        return false;
    }

    tokens.shift();

    if (!tokens.length) {
        console.error('Unfinished $f statement' + label);
        return false;
    }

    if (tokens.front() !== '$.') {
        console.error('Expected end of $f statement ' + label + ' but found ' + tokens.front());
        return false;
    }

    tokens.shift(); // Discard $. token

    // Create new floating hypothesis
    const newhyp: Expression = [];
    newhyp.push(typeToken);
    newhyp.push(variable);
    hypotheses.set(label, { first: newhyp, second: true });
    scopes[scopes.length - 1].activehyp.push(label);
    scopes[scopes.length - 1].floatinghyp.set(variable, label);

    return true;
};

// Parse labeled statement. Return true iff okay.
let parselabel = (label: string): boolean => {
    if (constants.has(label)) {
        console.error('Attempt to reuse constant ' + label + ' as a label');
        return false;
    }

    if (variables.has(label)) {
        console.error('Attempt to reuse variable ' + label + ' as a label');
        return false;
    }

    if (labelused(label)) {
        console.error('Attempt to reuse label ' + label);
        return false;
    }

    if (!tokens.length) {
        console.error('Unfinished labeled statement');
        return false;
    }

    const typeToken = tokens.shift();

    let okay = true;
    if (typeToken === '$p') {
        okay = parsep(label);
    } else if (typeToken === '$e') {
        okay = parsee(label);
    } else if (typeToken === '$a') {
        okay = parsea(label);
    } else if (typeToken === '$f') {
        okay = parsef(label);
    } else {
        console.error('Unexpected token ' + typeToken + ' encountered');
        return false;
    }

    return okay;
};

// Parse $d statement. Return true iff okay.
let parsed = (): boolean => {
    const dvars = new Set<string>();
    let token: string;

    while (tokens.length && (token = tokens.front()) !== '$.') {
        tokens.shift();

        if (!isactivevariable(token)) {
            console.error('Token ' + token + ' is not an active variable, ' + 'but was found in a $d statement');
            return false;
        }

        if (dvars.has(token)) {
            console.error('$d statement mentions ' + token + ' twice');
            return false;
        }

        dvars.add(token);
    }

    if (!tokens.length) {
        console.error('Unterminated $d statement');
        return false;
    }

    if (dvars.size < 2) {
        console.error('Not enough items in $d statement');
        return false;
    }

    // Record it
    scopes[scopes.length - 1].disjvars.push(dvars);

    tokens.shift(); // Discard $. token

    return true;
};

// Parse $c statement. Return true iff okay.
let parsec = (): boolean => {
    if (scopes.length > 1) {
        console.error('$c statement occurs in inner block');
        return false;
    }

    let token: string;
    let listempty = true;
    while (tokens.length && (token = tokens.front()) !== '$.') {
        tokens.shift();
        listempty = false;

        if (!ismathsymboltoken(token)) {
            console.error('Attempt to declare ' + token + ' as a constant');
            return false;
        }
        if (variables.has(token)) {
            console.error('Attempt to redeclare variable ' + token + ' as a constant');
            return false;
        }
        if (labelused(token)) {
            console.error('Attempt to reuse label ' + token + ' as a constant');
            return false;
        }
        if (constants.has(token)) {
            console.error('Attempt to redeclare constant ' + token);
            return false;
        }
        constants.add(token);
    }

    if (!tokens.length) {
        console.error('Unterminated $c statement');
        return false;
    }

    if (listempty) {
        console.error('Empty $c statement');
        return false;
    }

    tokens.shift(); // Discard $. token

    return true;
};

// Parse $v statement. Return true iff okay.
let parsev = (): boolean => {
    let token: string;
    let listempty = true;
    while (tokens.length && (token = tokens.front()) !== '$.') {
        tokens.shift();
        listempty = false;

        if (!ismathsymboltoken(token)) {
            console.error('Attempt to declare ' + token + ' as a variable');
            return false;
        }
        if (constants.has(token)) {
            console.error('Attempt to redeclare constant ' + token + ' as a variable');
            return false;
        }
        if (labelused(token)) {
            console.error('Attempt to reuse label ' + token + ' as a variable');
            return false;
        }
        const alreadyactive: boolean = isactivevariable(token);
        if (alreadyactive) {
            console.error('Attempt to redeclare active variable ' + token);
            return false;
        }
        variables.add(token);
        scopes[scopes.length - 1].activevariables.add(token);
    }

    if (!tokens.length) {
        console.error('Unterminated $v statement');
        return false;
    }

    if (listempty) {
        console.error('Empty $v statement');
        return false;
    }

    tokens.shift(); // Discard $. token

    return true;
};

const EXIT_FAILURE = 1;

let main = async (argv: string[]): Promise<number> => {
    if (argv.length !== 2) {
        console.error('Syntax: checkmm <filename>');
        return EXIT_FAILURE;
    }

    const okay = await readtokens(argv[1]);
    if (!okay) return EXIT_FAILURE;

    scopes.push(new Scope());

    while (tokens.length) {
        const token = tokens.shift()!;

        let okay = true;

        if (islabeltoken(token)) {
            okay = parselabel(token);
        } else if (token === '$d') {
            okay = parsed();
        } else if (token === '${') {
            scopes.push(new Scope());
        } else if (token == '$}') {
            scopes.pop();
            if (!scopes.length) {
                console.error('$} without corresponding ${');
                return EXIT_FAILURE;
            }
        } else if (token === '$c') {
            okay = parsec();
        } else if (token === '$v') {
            okay = parsev();
        } else {
            console.error('Unexpected token ' + token + ' encountered');
            return EXIT_FAILURE;
        }
        if (!okay) return EXIT_FAILURE;
    }

    if (scopes.length > 1) {
        console.error('${ without corresponding $}');
        return EXIT_FAILURE;
    }

    return 0;
};

// Are we being run as a program or a library?
if (process.argv.length >= 2 && process.argv[1] === __filename) {
    // We are being run as a program
    main(process.argv.slice(1)).then(exitCode => {
        process.exitCode = exitCode;
    });
}

export default {
    tokens,
    setTokens: (_tokens: Queue<string>) => {
        tokens = _tokens;
    },
    constants,
    setConstants: (_constants: Set<string>) => {
        constants = _constants;
    },
    hypotheses,
    setHypotheses: (_hypotheses: Map<string, Hypothesis>) => {
        hypotheses = _hypotheses;
    },
    variables,
    setVariables: (_variables: Set<string>) => {
        variables = _variables;
    },
    assertions,
    setAssertions: (_assertions: Map<string, Assertion>) => {
        assertions = _assertions;
    },
    scopes,
    setScopes: (_scopes: Scope[]) => {
        scopes = _scopes;
    },
    labelused,
    setLabelused: (_labelused: (label: string) => boolean) => {
        labelused = _labelused;
    },
    getfloatinghyp,
    setGetfloatinghyp: (_getfloatinghyp: (vari: string) => string) => {
        getfloatinghyp = _getfloatinghyp;
    },
    isactivevariable,
    setIsactivevariable: (_isactivevariable: (str: string) => boolean) => {
        isactivevariable = _isactivevariable;
    },
    isactivehyp,
    setIsactivehyp: (_isactivehyp: (str: string) => boolean) => {
        isactivehyp = _isactivehyp;
    },
    isdvr,
    setIsdvr: (_isdvr: (var1: string, var2: string) => boolean) => {
        isdvr = _isdvr;
    },
    ismmws,
    setIsmmws: (_ismmws: (ch: string) => boolean) => {
        ismmws = _ismmws;
    },
    islabeltoken,
    setIslabeltoken: (_islabeltoken: (token: string) => boolean) => {
        islabeltoken = _islabeltoken;
    },
    ismathsymboltoken,
    setIsmathsymboltoken: (_ismathsymboltoken: (token: string) => boolean) => {
        ismathsymboltoken = _ismathsymboltoken;
    },
    containsonlyupperorq,
    setContainsonlyupperorq: (_containsonlyupperorq: (token: string) => boolean) => {
        containsonlyupperorq = _containsonlyupperorq;
    },
    nexttoken,
    setNexttoken: (_nexttoken: (input: istream) => string) => {
        nexttoken = _nexttoken;
    },
    readtokens,
    setReadtokens: (_readtokens: (filename: string) => Promise<boolean>) => {
        readtokens = _readtokens;
    },
    constructassertion,
    setConstructassertion: (_constructassertion: (label: string, exp: Expression) => Assertion) => {
        constructassertion = _constructassertion;
    },
    readexpression,
    setReadexpression: (_readexpression: (stattype: string, label: string, terminator: string) => Expression) => {
        readexpression = _readexpression;
    },
    makesubstitution,
    setMakesubstitution: (
        _makesubstitution: (original: Expression, substmap: Map<string, Expression>) => Expression,
    ) => {
        makesubstitution = _makesubstitution;
    },
    getproofnumbers,
    setGetproofnumbers: (_getproofnumbers: (label: string, proof: string) => number[]) => {
        getproofnumbers = _getproofnumbers;
    },
    verifyassertionref,
    setVerifyassertionref: (
        _verifyassertionref: (thlabel: string, reflabel: string, stack: Stack<Expression>) => Stack<Expression>,
    ) => {
        verifyassertionref = _verifyassertionref;
    },
    verifyregularproof,
    setVerifyrefularproof: (_verifyregularproof: (label: string, theorem: Assertion, proof: string[]) => boolean) => {
        verifyregularproof = _verifyregularproof;
    },
    verifycompressedproof,
    setVerifycompressedproof: (
        _verifycompressedproof: (
            label: string,
            theorem: Assertion,
            labels: string[],
            proofnumbers: number[],
        ) => boolean,
    ) => {
        verifycompressedproof = _verifycompressedproof;
    },
    parsep,
    setParsep: (_parsep: (label: string) => boolean) => {
        parsep = _parsep;
    },
    parsee,
    setParsee: (_parsee: (label: string) => boolean) => {
        parsee = _parsee;
    },
    parsea,
    setParsea: (_parsea: (label: string) => boolean) => {
        parsea = _parsea;
    },
    parsef,
    setParsef: (_parsef: (label: string) => boolean) => {
        parsef = _parsef;
    },
    parselabel,
    setParselabel: (_parselabel: (label: string) => boolean) => {
        parselabel = _parselabel;
    },
    parsed,
    setParsed: (_parsed: () => boolean) => {
        parsed = _parsed;
    },
    parsec,
    setParsec: (_parsec: () => boolean) => {
        parsec = _parsec;
    },
    parsev,
    setParsev: (_parsev: () => boolean) => {
        parsev = _parsev;
    },
    main,
    setMain: (_main: (argv: string[]) => Promise<number>) => {
        main = _main;
    },
};
