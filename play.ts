import checkmm, { Assertion } from './src/checkmm';

checkmm.setHypotheses(
    new Map(
        Object.entries({
            tt: {
                first: ['term', 't'],
                second: true,
            },
            tr: {
                first: ['term', 'r'],
                second: true,
            },
            ts: {
                first: ['term', 's'],
                second: true,
            },
            wp: {
                first: ['wff', 'P'],
                second: true,
            },
            wq: {
                first: ['wff', 'Q'],
                second: true,
            },
            min: {
                first: ['|-', 'P'],
                second: false,
            },
            maj: {
                first: '|- ( P -> Q )'.split(' '),
                second: false,
            },
        }),
    ),
);

checkmm.setAssertions(
    new Map(
        Object.entries({
            tze: {
                expression: ['term', '0'],
                disjvars: new Set(),
                hypotheses: [],
            },
            tpl: {
                expression: ['term', '(', 't', '+', 'r', ')'],
                disjvars: new Set(),
                hypotheses: ['tt', 'tr'],
            },
            weq: {
                expression: ['wff', 't', '=', 'r'],
                disjvars: new Set(),
                hypotheses: ['tt', 'tr'],
            },
            a1: {
                expression: '|- ( t = r -> ( t = s -> r = s ) )'.split(' '),
                disjvars: new Set(),
                hypotheses: ['tt', 'tr', 'ts'],
            },
            a2: {
                expression: ['|-', '(', 't', '+', '0', ')', '=', 't'],
                disjvars: new Set(),
                hypotheses: ['tt'],
            },
            mp: {
                expression: ['|-', 'Q'],
                disjvars: new Set(),
                hypotheses: ['wp', 'wq', 'min', 'maj'],
            },
            wim: {
                expression: ['wff', '(', 'P', '->', 'Q', ')'],
                disjvars: new Set(),
                hypotheses: ['wp', 'wq'],
            },
        }),
    ),
);

checkmm.setConstants(new Set(['(', ')', '+', '->', '0', '=', 'term', 'wff', '|-']));

checkmm.setVariables(new Set<string>(['P', 'Q', 'r', 's', 't']));

checkmm.setTokens([]);

checkmm.setScopes([
    {
        activevariables: new Set<string>(['P', 'Q', 'r', 's', 't']),
        activehyp: ['tt', 'tr', 'ts', 'wp', 'wq'],
        disjvars: [],
        floatinghyp: new Map(
            Object.entries({
                P: 'wp',
                Q: 'wq',
                r: 'tr',
                s: 'ts',
                t: 'tt',
            }),
        ),
    },
]);

const labels = 'tze tpl weq a2 wim a1 mp'.split(' ');
const proofnumbers = checkmm.getproofnumbers('th1', 'ABCZADZAADZAEZJJKFLIAAGHH')!;

const theorem: Assertion = {
    hypotheses: ['tt'],
    disjvars: new Set(),
    expression: ['|-', 't', '=', 't'],
};

const result2: boolean = checkmm.verifycompressedproof('th1', theorem, labels, proofnumbers);
console.log({result2});

