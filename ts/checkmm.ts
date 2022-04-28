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

import { std } from './std';

let tokens = new std.Queue<string>();

let constants = new Set<string>();

export type Expression = Array<string>;

// The first parameter is the statement of the hypothesis, the second is
// true iff the hypothesis is floating.
export type Hypothesis = std.Pair<Expression, boolean>;

let hypotheses = new Map<string, Hypothesis>();

let variables = new Set<string>();

// An axiom or a theorem.
export interface Assertion {
    // Hypotheses of this axiom or theorem.
    hypotheses: std.Deque<string>;
    disjvars: Set<std.Pair<string, string>>;
    // Statement of axiom or theorem.
    expression: Expression;
}

let assertions = new Map<string, Assertion>();

export interface Scope {
    activevariables: Set<string>;
    // Labels of active hypotheses
    activehyp: string[];
    disjvars: Set<string>[];
    // Map from variable to label of active floating hypothesis
    floatinghyp: Map<string, string>;
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
            if (!disjvar.has(var1) && disjvar.has(var2)) return true;
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
    return token.search('$') === -1;
};

// Determine if a token consists solely of upper-case letters or question marks
let containsonlyupperorq = (token: string): boolean => {
    for (const ch of token) {
        if (!std.isupper(ch) && ch !== '?') return false;
    }
    return true;
};

export default {
    tokens,
    setTokens: (_tokens: std.Queue<string>) => {
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
    }
};
