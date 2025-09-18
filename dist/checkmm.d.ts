import { Deque, Pair, Stack, Std } from './std';
import { TokenArray, Tokens } from './tokens';
export { Deque, Pair, Stack, TokenArray, Tokens };
export type ScopeArray = ArrayLike<Scope> & Pick<Array<Scope>, 'pop' | 'push' | 'slice'> & {
    [Symbol.iterator](): IterableIterator<Scope>;
};
export type Expression = Array<string>;
export type Hypothesis = Pair<Expression, boolean>;
export declare class Assertion {
    hypotheses: Deque<string>;
    disjvars: Set<Pair<string, string>>;
    expression: Expression;
}
export declare class Scope {
    activevariables: Set<string>;
    activehyp: string[];
    disjvars: Set<string>[];
    floatinghyp: Map<string, string>;
}
export interface FileInclusion {
    startPosition: number;
    filename: string;
}
declare const _default: {
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
};
export default _default;
