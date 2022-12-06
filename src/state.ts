/* eslint-disable @typescript-eslint/no-explicit-any */
import checkmm, { Assertion, Expression, FileInclusion, Hypothesis, ScopeArray } from './checkmm';
import { Std, Stack } from './std';
import { Tokens } from './tokens';

interface CheckmmState {
    data: string;
    dataPosition: number;
    readtokenstofileinclusion: () => FileInclusion | undefined;
    readFile: (filename: string) => Promise<string>;
    std: Std;
    createTokenArray: () => Tokens;
    tokens: Tokens;
    constants: Set<string>;
    hypotheses: Map<string, Hypothesis>;
    variables: Set<string>;
    assertions: Map<string, Assertion>;
    scopes: ScopeArray;
    labelused: (label: string) => boolean;
    getfloatinghyp: (vari: string) => string;
    isactivevariable: (str: string) => boolean;
    isactivehyp: (str: string) => boolean;
    isdvr: (var1: string, var2: string) => boolean;
    ismmws: (ch: string) => boolean;
    islabeltoken: (token: string) => boolean;
    ismathsymboltoken: (token: string) => boolean;
    containsonlyupperorq: (token: string) => boolean;
    nexttoken: () => string;
    mmfilenamesalreadyencountered: Set<string>;
    readcomment: () => string;
    nexttokenskipcomments: () => string;
    readfileinclusion: () => string;
    readtokens: (filename: string) => Promise<void>;
    constructassertion: (label: string, exp: Expression) => Assertion;
    readexpression: (stattype: string, label: string, terminator: string) => Expression;
    makesubstitution: (original: Expression, substmap: Map<string, Expression>) => Expression;
    getproofnumbers: (label: string, proof: string) => number[];
    verifyassertionref: (thlabel: string, reflabel: string, stack: Stack<Expression>) => Stack<Expression>;
    verifyregularproof: (label: string, theorem: Assertion, proof: string[]) => void;
    verifycompressedproof: (label: string, theorem: Assertion, labels: string[], proofnumbers: number[]) => void;
    parsep: (label: string) => void;
    parsee: (label: string) => void;
    parsea: (label: string) => void;
    parsef: (label: string) => void;
    parselabel: (label: string) => void;
    parsed: () => void;
    parsec: () => void;
    parsev: () => void;
    processtokens: () => void;
    main: (argv: string[]) => Promise<number>;
}

export const getCheckmmState = (): CheckmmState => {
    return { ...checkmm };
};

export const setCheckmmState = (state: Partial<CheckmmState>) => {
    for (const key in checkmm) {
        if ((state as any)[key] !== undefined) {
            (checkmm as any)[key] = (state as any)[key];
        }
    }
};
