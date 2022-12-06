"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scope = exports.Assertion = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const std_1 = __importDefault(require("./std"));
const tokens_1 = require("./tokens");
let std = std_1.default;
let createTokenArray = tokens_1.createTokenArray;
let data = '';
let dataPosition = 0;
let tokens = createTokenArray();
let constants = new Set();
let hypotheses = new Map();
let variables = new Set();
// An axiom or a theorem.
class Assertion {
    constructor() {
        // Hypotheses of this axiom or theorem.
        this.hypotheses = [];
        this.disjvars = new Set();
        // Statement of axiom or theorem.
        this.expression = [];
    }
}
exports.Assertion = Assertion;
let assertions = new Map();
class Scope {
    constructor() {
        this.activevariables = new Set();
        // Labels of active hypotheses
        this.activehyp = [];
        this.disjvars = [];
        // Map from variable to label of active floating hypothesis
        this.floatinghyp = new Map();
    }
}
exports.Scope = Scope;
let scopes = new Array();
// Determine if a string is used as a label
let labelused = (label) => {
    return hypotheses.get(label) !== undefined || assertions.get(label) !== undefined;
};
// Find active floating hypothesis corresponding to variable, or empty string
// if there isn't one.
let getfloatinghyp = (vari) => {
    for (const scope of scopes) {
        const loc = scope.floatinghyp.get(vari);
        if (loc !== undefined)
            return loc;
    }
    return '';
};
// Determine if a string is an active variable.
let isactivevariable = (str) => {
    for (const scope of scopes) {
        if (scope.activevariables.has(str))
            return true;
    }
    return false;
};
// Determine if a string is the label of an active hypothesis.
let isactivehyp = (str) => {
    for (const scope of scopes) {
        if (scope.activehyp.find(_str => str === _str))
            return true;
    }
    return false;
};
// Determine if there is an active disjoint variable restriction on
// two different variables.
let isdvr = (var1, var2) => {
    if (var1 === var2)
        return false;
    for (const scope of scopes) {
        for (const disjvar of scope.disjvars) {
            if (disjvar.has(var1) && disjvar.has(var2))
                return true;
        }
    }
    return false;
};
// Determine if a character is white space in Metamath.
let ismmws = (ch) => {
    // This doesn't include \v ("vertical tab"), as the spec omits it.
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\f' || ch === '\r';
};
// Determine if a token is a label token.
let islabeltoken = (token) => {
    for (const ch of token) {
        if (!(std.isalnum(ch) || ch === '.' || ch === '-' || ch === '_'))
            return false;
    }
    return true;
};
// Determine if a token is a math symbol token.
let ismathsymboltoken = (token) => {
    return !token.includes('$');
};
// Determine if a token consists solely of upper-case letters or question marks
let containsonlyupperorq = (token) => {
    for (const ch of token) {
        if (!std.isupper(ch) && ch !== '?')
            return false;
    }
    return true;
};
let nexttoken = () => {
    let ch;
    let token = '';
    // Skip whitespace
    while (!!(ch = data.charAt(dataPosition)) && ismmws(ch)) {
        ++dataPosition;
    }
    // Get token
    while (!!(ch = data.charAt(dataPosition)) && !ismmws(ch)) {
        if (ch < '!' || ch > '~') {
            throw new Error('Invalid character read with code 0x' + ch.charCodeAt(0).toString(16));
        }
        token += ch;
        ++dataPosition;
    }
    return token;
};
let readcomment = () => {
    const commentStartPosition = dataPosition;
    let token;
    while ((token = nexttoken()).length) {
        if (token === '$)') {
            return data.slice(commentStartPosition, dataPosition - 2);
        }
        if (token.includes('$(')) {
            throw new Error('Characters $( found in a comment');
        }
        if (token.includes('$)')) {
            throw new Error('Characters $) found in a comment');
        }
    }
    throw new Error('Unclosed comment');
};
let nexttokenskipcomments = () => {
    let token = '';
    while ((token = nexttoken()).length && token === '$(') {
        readcomment();
    }
    return token;
};
let readfileinclusion = () => {
    let newfilename = '';
    let token;
    while ((token = nexttokenskipcomments()).length) {
        if (!newfilename.length) {
            if (token.includes('$')) {
                throw new Error('Filename ' + token + ' contains a $');
            }
            newfilename = token;
            continue;
        }
        else {
            if (token !== '$]') {
                throw new Error("Didn't find closing file inclusion delimiter");
            }
            return newfilename;
        }
    }
    throw new Error('Unfinished file inclusion command');
};
let readtokenstofileinclusion = () => {
    let token;
    while ((token = nexttokenskipcomments()).length) {
        if (token === '$[') {
            const startPosition = dataPosition - 2;
            const filename = readfileinclusion();
            return { startPosition, filename };
        }
        tokens.push(token);
    }
};
let readFile = (filename) => __awaiter(void 0, void 0, void 0, function* () { return promises_1.default.readFile(filename, { encoding: 'utf-8' }); });
let mmfilenamesalreadyencountered = new Set();
let readtokens = (filename, lastFileInclusionStart = 0) => __awaiter(void 0, void 0, void 0, function* () {
    const alreadyencountered = mmfilenamesalreadyencountered.has(filename);
    if (alreadyencountered)
        return;
    mmfilenamesalreadyencountered.add(filename);
    try {
        data = data.slice(0, lastFileInclusionStart) + (yield readFile(filename)) + data.slice(dataPosition);
        dataPosition = lastFileInclusionStart;
    }
    catch (_e) {
        throw new Error('Could not open ' + filename);
    }
    for (;;) {
        const fileInclusion = readtokenstofileinclusion();
        if (fileInclusion) {
            if (path_1.default) {
                fileInclusion.filename = path_1.default.normalize(path_1.default.join(path_1.default.dirname(filename), fileInclusion.filename));
            }
            yield readtokens(fileInclusion.filename, fileInclusion.startPosition);
        }
        else {
            break;
        }
    }
});
// Construct an Assertion from an Expression. That is, determine the
// mandatory hypotheses and disjoint variable restrictions.
// The Assertion is inserted into the assertions collection,
// and is returned by reference.
let constructassertion = (label, exp) => {
    const assertion = new Assertion();
    assertions.set(label, assertion);
    assertion.expression = exp;
    const varsused = new Set();
    // Determine variables used and find mandatory hypotheses
    for (const e of exp) {
        if (variables.has(e))
            varsused.add(e);
    }
    for (const scope of scopes.slice().reverse()) {
        const hypvec = scope.activehyp;
        for (const item2 of hypvec.slice().reverse()) {
            const hyp = hypotheses.get(item2);
            if (hyp.second && varsused.has(hyp.first[1])) {
                // Mandatory floating hypothesis
                assertion.hypotheses.unshift(item2);
            }
            else if (!hyp.second) {
                // Essential hypothesis
                assertion.hypotheses.unshift(item2);
                for (const item3 of hyp.first) {
                    if (variables.has(item3))
                        varsused.add(item3);
                }
            }
        }
    }
    // Determine mandatory disjoint variable restrictions
    for (const scope of scopes) {
        const disjvars = scope.disjvars;
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
let readexpression = (stattype, label, terminator) => {
    if (tokens.empty()) {
        throw new Error('Unfinished $' + stattype + ' statement ' + label);
    }
    const type = tokens.front();
    if (!constants.has(type)) {
        throw new Error('First symbol in $' + stattype + ' statement ' + label + ' is ' + type + ' which is not a constant');
    }
    tokens.pop();
    const exp = [type];
    let token;
    while (!tokens.empty() && (token = tokens.front()) !== terminator) {
        tokens.pop();
        if (!constants.has(token) && !getfloatinghyp(token).length) {
            throw new Error('In $' +
                stattype +
                ' statement ' +
                label +
                ' token ' +
                token +
                ' found which is not a constant or variable in an' +
                ' active $f statement');
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
let makesubstitution = (original, substmap) => {
    let destination = [];
    for (const item of original) {
        const item2 = substmap.get(item);
        if (!item2) {
            // Constant
            destination.push(item);
        }
        else {
            // Variable
            destination = [...destination, ...item2];
        }
    }
    return destination;
};
// Get the raw numbers from compressed proof format.
// The letter Z is translated as 0.
let getproofnumbers = (label, proof) => {
    const proofnumbers = [];
    let num = 0;
    let justgotnum = false;
    for (const item of proof) {
        if (item <= 'T') {
            const addval = item.charCodeAt(0) - ('A'.charCodeAt(0) - 1);
            if (num > Number.MAX_SAFE_INTEGER / 20 || 20 * num > Number.MAX_SAFE_INTEGER - addval) {
                throw new Error('Overflow computing numbers in compressed proof of ' + label);
            }
            proofnumbers.push(20 * num + addval);
            num = 0;
            justgotnum = true;
        }
        else if (item <= 'Y') {
            const addval = item.charCodeAt(0) - 'T'.charCodeAt(0);
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
let verifyassertionref = (thlabel, reflabel, stack) => {
    const assertion = assertions.get(reflabel);
    if (stack.size() < assertion.hypotheses.length) {
        throw new Error('In proof of theorem ' + thlabel + ' not enough items found on stack');
    }
    const base = stack.size() - assertion.hypotheses.length;
    const substitutions = new Map();
    // Determine substitutions and check that we can unify
    for (let i = 0; i < assertion.hypotheses.length; ++i) {
        const hypothesis = hypotheses.get(assertion.hypotheses[i]);
        if (hypothesis.second) {
            // Floating hypothesis of the referenced assertion
            if (hypothesis.first[0] !== stack.at(base + i)[0]) {
                throw new Error('In proof of theorem ' + thlabel + ' unification failed');
            }
            const subst = stack.at(base + i).slice(1);
            substitutions.set(hypothesis.first[1], subst);
        }
        else {
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
        const exp1 = substitutions.get(item.first);
        const exp2 = substitutions.get(item.second);
        const exp1vars = new Set();
        for (const exp1item of exp1) {
            if (variables.has(exp1item))
                exp1vars.add(exp1item);
        }
        const exp2vars = new Set();
        for (const exp2item of exp2) {
            if (variables.has(exp2item))
                exp2vars.add(exp2item);
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
    const dest = makesubstitution(assertion.expression, substitutions);
    stack.push(dest);
    return stack;
};
// Verify a regular proof. The "proof" argument should be a non-empty sequence
// of valid labels. Return true iff the proof is correct.
let verifyregularproof = (label, theorem, proof) => {
    let stack = std.createstack();
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
let verifycompressedproof = (label, theorem, labels, proofnumbers) => {
    let stack = std.createstack();
    const mandhypt = theorem.hypotheses.length;
    const labelt = mandhypt + labels.length;
    const savedsteps = [];
    for (const item of proofnumbers) {
        // Save the last proof step if 0
        if (item === 0) {
            savedsteps.push(stack.top());
            continue;
        }
        // If step is a mandatory hypothesis, just push it onto the stack.
        if (item <= mandhypt) {
            stack.push(hypotheses.get(theorem.hypotheses[item - 1]).first);
        }
        else if (item <= labelt) {
            const proofstep = labels[item - mandhypt - 1];
            // If step is a (non-mandatory) hypothesis,
            // just push it onto the stack.
            const hyp = hypotheses.get(proofstep);
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
let parsep = (label) => {
    const newtheorem = readexpression('p', label, '$=');
    const assertion = constructassertion(label, newtheorem);
    // Now for the proof
    if (tokens.empty()) {
        throw new Error('Unfinished $p statement ' + label);
    }
    if (tokens.front() === '(') {
        // Compressed proof
        tokens.pop();
        // Get labels
        const labels = [];
        let token;
        while (!tokens.empty() && (token = tokens.front()) !== ')') {
            tokens.pop();
            labels.push(token);
            if (token === label) {
                throw new Error('Proof of theorem ' + label + ' refers to itself');
            }
            else if (assertion.hypotheses.find(_token => _token === token)) {
                throw new Error('Compressed proof of theorem ' + label + ' has mandatory hypothesis ' + token + ' in label list');
            }
            else if (!assertions.has(token) && !isactivehyp(token)) {
                throw new Error('Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement');
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
        const proofnumbers = getproofnumbers(label, proof);
        verifycompressedproof(label, assertion, labels, proofnumbers);
    }
    else {
        // Regular (uncompressed proof)
        const proof = [];
        let incomplete = false;
        let token;
        while (!tokens.empty() && (token = tokens.front()) !== '$.') {
            tokens.pop();
            proof.push(token);
            if (token === '?')
                incomplete = true;
            else if (token === label) {
                throw new Error('Proof of theorem ' + label + ' refers to itself');
            }
            else if (!assertions.has(token) && !isactivehyp(token)) {
                throw new Error('Proof of theorem ' + label + ' refers to ' + token + ' which is not an active statement');
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
let parsee = (label) => {
    const newhyp = readexpression('e', label, '$.');
    // Create new essential hypothesis
    hypotheses.set(label, { first: newhyp, second: false });
    scopes[scopes.length - 1].activehyp.push(label);
};
// Parse $a statement. Return true iff okay.
let parsea = (label) => {
    const newaxiom = readexpression('a', label, '$.');
    constructassertion(label, newaxiom);
};
// Parse $f statement. Return true iff okay.
let parsef = (label) => {
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
        throw new Error('Second symbol in $f statement ' + label + ' is ' + variable + ' which is not an active variable');
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
    const newhyp = [];
    newhyp.push(typeToken);
    newhyp.push(variable);
    hypotheses.set(label, { first: newhyp, second: true });
    scopes[scopes.length - 1].activehyp.push(label);
    scopes[scopes.length - 1].floatinghyp.set(variable, label);
};
// Parse labeled statement. Return true iff okay.
let parselabel = (label) => {
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
    }
    else if (typeToken === '$e') {
        parsee(label);
    }
    else if (typeToken === '$a') {
        parsea(label);
    }
    else if (typeToken === '$f') {
        parsef(label);
    }
    else {
        throw new Error('Unexpected token ' + typeToken + ' encountered');
    }
};
// Parse $d statement. Return true iff okay.
let parsed = () => {
    const dvars = new Set();
    let token;
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
let parsec = () => {
    if (scopes.length > 1) {
        throw new Error('$c statement occurs in inner block');
    }
    let token;
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
let parsev = () => {
    let token;
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
        const alreadyactive = isactivevariable(token);
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
let processtokens = () => {
    // Reverse the order of the tokens.  We do this O(n) operation just
    // once here so that the tokens were added with 'push' O(1) but
    // can be removed with 'pop' O(1) in the order they were added (first
    // in first out).  It's completely impractical to use 'shift' or 'unshift'
    // because they're O(n) operations.
    tokens.reverse();
    scopes.push(new Scope());
    while (!tokens.empty()) {
        const token = tokens.pop();
        if (islabeltoken(token)) {
            parselabel(token);
        }
        else if (token === '$d') {
            parsed();
        }
        else if (token === '${') {
            scopes.push(new Scope());
        }
        else if (token === '$}') {
            scopes.pop();
            if (!scopes.length) {
                throw new Error('$} without corresponding ${');
            }
        }
        else if (token === '$c') {
            parsec();
        }
        else if (token === '$v') {
            parsev();
        }
        else {
            throw new Error('Unexpected token ' + token + ' encountered');
        }
    }
    if (scopes.length > 1) {
        throw new Error('${ without corresponding $}');
    }
};
const EXIT_FAILURE = 1;
let main = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (argv.length !== 2) {
            console.error('Syntax: checkmm <filename>');
            return EXIT_FAILURE;
        }
        yield readtokens(argv[1]);
        processtokens();
        return 0;
    }
    catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        }
        else {
            console.error(err);
        }
        return EXIT_FAILURE;
    }
});
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
    const isCliCommand = validCliSuffices.reduce((acc, suffix) => (acc ? acc : executedScript.slice(-suffix.length) === suffix), false);
    if (isCliCommand) {
        // We are being run as a cli program
        main(process.argv.slice(1)).then(exitCode => {
            process.exitCode = exitCode;
        });
    }
}
exports.default = {
    get data() {
        return data;
    },
    set data(_data) {
        data = _data;
    },
    get dataPosition() {
        return dataPosition;
    },
    set dataPosition(_dataPosition) {
        dataPosition = _dataPosition;
    },
    get readtokenstofileinclusion() {
        return readtokenstofileinclusion;
    },
    set readtokenstofileinclusion(_readtokenstofileinclusion) {
        readtokenstofileinclusion = _readtokenstofileinclusion;
    },
    get readFile() {
        return readFile;
    },
    set readFile(_readFile) {
        readFile = _readFile;
    },
    get std() {
        return std;
    },
    set std(_std) {
        std = _std;
    },
    get createTokenArray() {
        return createTokenArray;
    },
    set createTokenArray(_createTokenArray) {
        createTokenArray = _createTokenArray;
    },
    get tokens() {
        return tokens;
    },
    set tokens(_tokens) {
        tokens = _tokens;
    },
    get constants() {
        return constants;
    },
    set constants(_constants) {
        constants = _constants;
    },
    get hypotheses() {
        return hypotheses;
    },
    set hypotheses(_hypotheses) {
        hypotheses = _hypotheses;
    },
    get variables() {
        return variables;
    },
    set variables(_variables) {
        variables = _variables;
    },
    get assertions() {
        return assertions;
    },
    set assertions(_assertions) {
        assertions = _assertions;
    },
    get scopes() {
        return scopes;
    },
    set scopes(_scopes) {
        scopes = _scopes;
    },
    get labelused() {
        return labelused;
    },
    set labelused(_labelused) {
        labelused = _labelused;
    },
    get getfloatinghyp() {
        return getfloatinghyp;
    },
    set getfloatinghyp(_getfloatinghyp) {
        getfloatinghyp = _getfloatinghyp;
    },
    get isactivevariable() {
        return isactivevariable;
    },
    set isactivevariable(_isactivevariable) {
        isactivevariable = _isactivevariable;
    },
    get isactivehyp() {
        return isactivehyp;
    },
    set isactivehyp(_isactivehyp) {
        isactivehyp = _isactivehyp;
    },
    get isdvr() {
        return isdvr;
    },
    set isdvr(_isdvr) {
        isdvr = _isdvr;
    },
    get ismmws() {
        return ismmws;
    },
    set ismmws(_ismmws) {
        ismmws = _ismmws;
    },
    get islabeltoken() {
        return islabeltoken;
    },
    set islabeltoken(_islabeltoken) {
        islabeltoken = _islabeltoken;
    },
    get ismathsymboltoken() {
        return ismathsymboltoken;
    },
    set ismathsymboltoken(_ismathsymboltoken) {
        ismathsymboltoken = _ismathsymboltoken;
    },
    get containsonlyupperorq() {
        return containsonlyupperorq;
    },
    set containsonlyupperorq(_containsonlyupperorq) {
        containsonlyupperorq = _containsonlyupperorq;
    },
    get nexttoken() {
        return nexttoken;
    },
    set nexttoken(_nexttoken) {
        nexttoken = _nexttoken;
    },
    get mmfilenamesalreadyencountered() {
        return mmfilenamesalreadyencountered;
    },
    set mmfilenamesalreadyencountered(_mmfilenamesalreadyencountered) {
        mmfilenamesalreadyencountered = _mmfilenamesalreadyencountered;
    },
    get readcomment() {
        return readcomment;
    },
    set readcomment(_readcomment) {
        readcomment = _readcomment;
    },
    get nexttokenskipcomments() {
        return nexttokenskipcomments;
    },
    set nexttokenskipcomments(_nexttokenskipcomments) {
        nexttokenskipcomments = _nexttokenskipcomments;
    },
    get readfileinclusion() {
        return readfileinclusion;
    },
    set readfileinclusion(_readfileinclusion) {
        readfileinclusion = _readfileinclusion;
    },
    get readtokens() {
        return readtokens;
    },
    set readtokens(_readtokens) {
        readtokens = _readtokens;
    },
    get constructassertion() {
        return constructassertion;
    },
    set constructassertion(_constructassertion) {
        constructassertion = _constructassertion;
    },
    get readexpression() {
        return readexpression;
    },
    set readexpression(_readexpression) {
        readexpression = _readexpression;
    },
    get makesubstitution() {
        return makesubstitution;
    },
    set makesubstitution(_makesubstitution) {
        makesubstitution = _makesubstitution;
    },
    get getproofnumbers() {
        return getproofnumbers;
    },
    set getproofnumbers(_getproofnumbers) {
        getproofnumbers = _getproofnumbers;
    },
    get verifyassertionref() {
        return verifyassertionref;
    },
    set verifyassertionref(_verifyassertionref) {
        verifyassertionref = _verifyassertionref;
    },
    get verifyregularproof() {
        return verifyregularproof;
    },
    set verifyregularproof(_verifyregularproof) {
        verifyregularproof = _verifyregularproof;
    },
    get verifycompressedproof() {
        return verifycompressedproof;
    },
    set verifycompressedproof(_verifycompressedproof) {
        verifycompressedproof = _verifycompressedproof;
    },
    get parsep() {
        return parsep;
    },
    set parsep(_parsep) {
        parsep = _parsep;
    },
    get parsee() {
        return parsee;
    },
    set parsee(_parsee) {
        parsee = _parsee;
    },
    get parsea() {
        return parsea;
    },
    set parsea(_parsea) {
        parsea = _parsea;
    },
    get parsef() {
        return parsef;
    },
    set parsef(_parsef) {
        parsef = _parsef;
    },
    get parselabel() {
        return parselabel;
    },
    set parselabel(_parselabel) {
        parselabel = _parselabel;
    },
    get parsed() {
        return parsed;
    },
    set parsed(_parsed) {
        parsed = _parsed;
    },
    get parsec() {
        return parsec;
    },
    set parsec(_parsec) {
        parsec = _parsec;
    },
    get parsev() {
        return parsev;
    },
    set parsev(_parsev) {
        parsev = _parsev;
    },
    get processtokens() {
        return processtokens;
    },
    set processtokens(_processtokens) {
        processtokens = _processtokens;
    },
    get main() {
        return main;
    },
    set main(_main) {
        main = _main;
    },
};
//# sourceMappingURL=checkmm.js.map