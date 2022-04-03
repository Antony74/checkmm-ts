import { std } from './helpers';

type Expression = Array<string>;

// The first parameter is the statement of the hypothesis, the second is
// true iff the hypothesis is floating.
type Hypothesis = std.Pair<Expression, boolean>;

/*
const hypotheses = new Map<string, Hypothesis>();

// An axiom or a theorem.
interface Assertion {
    // Hypotheses of this axiom or theorem. 
    hypotheses: std.deque<string>;
    disjvars: Set<std.Pair<string, string>>;
    // Statement of axiom or theorem.
    expression: Expression;
}

const assertions = new Map<string, Assertion>();

// Determine if a string is used as a label
const labelused = (label: string): boolean => {
    return hypotheses.get(label) !== undefined || assertions.get(label) != undefined;
};*/
