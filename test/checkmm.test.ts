/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, describe, jest, beforeEach } from '@jest/globals';
import checkmm, { Assertion, Expression, Hypothesis } from '../src/checkmm';
import std, { Stack } from '../src/std';
import { createTokenArray, Tokens } from '../src/tokens';
import { getCheckmmState, setCheckmmState } from '../src/state';

describe('checkmm', () => {
    const initialState = getCheckmmState();

    beforeEach(() => {
        setCheckmmState(initialState);
    });

    it('exposes a number of properties, each has both a getter and a setter', () => {
        for (const label in checkmm) {
            const prop = (checkmm as any)[label]; // Test getter, will error if there isn't one
            (checkmm as any)[label] = prop; // Test setter, will error if there isn't one
        }
    });

    describe('labelused', () => {
        it('can determine if a label is used', () => {
            checkmm.hypotheses = new Map<string, Hypothesis>(
                Object.entries({
                    hello: {
                        first: ['my', 'hypothesis'],
                        second: false,
                    },
                }),
            );

            checkmm.assertions = new Map<string, Assertion>(
                Object.entries({
                    world: {
                        hypotheses: [],
                        disjvars: new Set(),
                        expression: [],
                    },
                }),
            );

            expect(checkmm.labelused('hello')).toEqual(true);
            expect(checkmm.labelused('meaningless')).toEqual(false);
            expect(checkmm.labelused('world')).toEqual(true);
        });
    });

    describe('getfloatinghyp', () => {
        it('can find a floating hypothesis', () => {
            checkmm.scopes = [
                {
                    activevariables: new Set<string>(),
                    activehyp: [],
                    disjvars: [],
                    floatinghyp: new Map<string, string>(
                        Object.entries({
                            hello: 'world',
                        }),
                    ),
                },
            ];

            expect(checkmm.getfloatinghyp('hello')).toEqual('world');
            expect(checkmm.getfloatinghyp('other')).toEqual('');
        });
    });

    describe('nexttoken', () => {
        it('can get the next token', () => {
            checkmm.data = 'hello world';
            checkmm.dataPosition = 0;
            let token = '';

            token = checkmm.nexttoken();
            expect(token).toEqual('hello');
            token = checkmm.nexttoken();
            expect(token).toEqual('world');
            token = checkmm.nexttoken();
            expect(token).toEqual('');
            token = checkmm.nexttoken();
            expect(token).toEqual('');

            checkmm.data = String.fromCharCode(127);
            checkmm.dataPosition = 0;

            let err;
            try {
                token = checkmm.nexttoken();
            } catch (_err) {
                err = _err;
            }

            expect(err instanceof Error && err.message).toEqual('Invalid character read with code 0x7f');
        });

        it('can process a lot of tokens without me getting bored waiting for the tests to finish', () => {
            let size = 100000;
            checkmm.data = Array.from({ length: size })
                .map((_value, index) => index)
                .join(' ');
            checkmm.dataPosition = 0;
            while (checkmm.nexttoken().length) {
                --size;
            }
            expect(size).toEqual(0);
        });
    });

    describe('readtokens', () => {
        it('can read tokens', async () => {
            const anatomymm = `
            $c ( ) -> wff $.
            $( Declare the metavariables we will use $)
            $v p q r s $.
            $( Declare wffs $)
            wp $f wff p $.
            wq $f wff q $.
            wr $f wff r $.
            ws $f wff s $.
            w2 $a wff ( p -> q ) $.
            
            $( Prove a simple theorem. $)
            wnew $p wff ( s -> ( r -> p ) ) $= ws wr wp w2 w2 $.`;

            checkmm.readFile = () => Promise.resolve(anatomymm);
            await checkmm.readtokens(__dirname + '/../../node_modules/metamath-test/anatomy.mm');
            expect(!!checkmm.tokens).toEqual(true);
        });
    });

    describe('constructassertion', () => {
        it('can construct assertions with disjoint variables', () => {
            checkmm.hypotheses = new Map(
                Object.entries({
                    wph: {
                        first: ['wff', 'ph'],
                        second: true,
                    },
                    vx: {
                        first: ['wff', 'x'],
                        second: true,
                    },
                }),
            );

            checkmm.scopes = [
                {
                    activevariables: new Set<string>(),
                    activehyp: ['wph', 'vx'],
                    disjvars: [new Set<string>()],
                    floatinghyp: new Map(),
                },
                {
                    activevariables: new Set<string>(),
                    activehyp: [],
                    disjvars: [new Set<string>(['ph', 'x'])],
                    floatinghyp: new Map(),
                },
            ];

            checkmm.variables = new Set<string>(['ps', 'ph', 'x']);

            const expression = '|- ( ph -> A. x ph )'.split(' ');
            const assertion: Assertion = checkmm.constructassertion('ax-17', expression);
            expect(assertion.hypotheses).toEqual(['wph', 'vx']);
            expect(assertion.disjvars).toEqual(new Set([{ first: 'ph', second: 'x' }]));
            expect(assertion.expression).toEqual(expression);
        });
    });

    describe('readexpression', () => {
        it('can read expressions', () => {
            checkmm.tokens = createTokenArray(...'|- ( ph -> ( ps -> ph ) ) $. $( Axiom _Frege_.'.split(' ').reverse());
            checkmm.constants = new Set(['|-', '(', ')', '->', 'ph', 'ps']);
            const expression = checkmm.readexpression('a', 'ax-1', '$.');
            expect(expression).toEqual('|- ( ph -> ( ps -> ph ) )'.split(' '));
        });
    });

    it('can make substitutions', () => {
        const expression: Expression = checkmm.makesubstitution(
            ['weather', 'is', 'sunny'],
            new Map(
                Object.entries({
                    sunny: ['raining', 'cats', 'and', 'dogs'],
                }),
            ),
        );
        expect(expression).toEqual(['weather', 'is', 'raining', 'cats', 'and', 'dogs']);
    });

    describe('proofnumbers', () => {
        it('can get proof numbers', () => {
            const proofnumbers: number[] = checkmm.getproofnumbers(
                'pm5.32',
                'ABCDZEZABFZEZFZACFZEZFZDZABGZACGZDPAQTDZERUADUCOUFABCHIAQTJRUAHKUDSUEUBABLACLMN',
            );
            expect(proofnumbers).toEqual([
                1, 2, 3, 4, 0, 5, 0, 1, 2, 6, 0, 5, 0, 6, 0, 1, 3, 6, 0, 5, 0, 6, 0, 4, 0, 1, 2, 7, 0, 1, 3, 7, 0, 4,
                16, 1, 17, 20, 4, 0, 5, 18, 21, 4, 23, 15, 26, 1, 2, 3, 8, 9, 1, 17, 20, 10, 18, 21, 8, 11, 24, 19, 25,
                22, 1, 2, 12, 1, 3, 12, 13, 14,
            ]);
        });
    });

    describe('verifyassertionref', () => {
        it('can verify a proof step references an assertion', () => {
            checkmm.assertions = new Map(
                Object.entries({
                    'ax-mp': {
                        hypotheses: ['wph', 'wps', 'min', 'maj'],
                        disjvars: new Set(),
                        expression: ['|-', 'ps'],
                    },
                }),
            );

            checkmm.hypotheses = new Map(
                Object.entries({
                    wph: {
                        first: ['wff', 'ph'],
                        second: true,
                    },
                    wps: {
                        first: ['wff', 'ps'],
                        second: true,
                    },
                    min: {
                        first: ['|-', 'ph'],
                        second: false,
                    },
                    maj: {
                        first: ['|-', '(', 'ph', '->', 'ps', ')'],
                        second: false,
                    },
                }),
            );

            const result: Stack<Expression> = checkmm.verifyassertionref(
                'mpdb',
                'ax-mp',
                std.createstack([
                    ['wff', 'ps'],
                    ['wff', 'ch'],
                    ['wff', 'ph'],
                    ['wff', 'ps'],
                    ['|-', 'ph'],
                    ['|-', '(', 'ph', '->', 'ps', ')'],
                ]),
            );

            expect(result.toArray()).toEqual([
                ['wff', 'ps'],
                ['wff', 'ch'],
                ['|-', 'ps'],
            ]);
        });

        it('can verify a proof step references an assertion with disjoint variable conditions', () => {
            checkmm.assertions = new Map(
                Object.entries({
                    'ax-17': {
                        hypotheses: ['wph', 'vx'],
                        expression: ['|-', '(', 'ph', '->', 'A.', 'x', 'ph', ')'],
                        disjvars: new Set([{ first: 'ph', second: 'x' }]),
                    },
                }),
            );

            checkmm.hypotheses = new Map(
                Object.entries({
                    wph: {
                        first: ['wff', 'ph'],
                        second: true,
                    },
                    vx: {
                        first: ['set', 'x'],
                        second: true,
                    },
                }),
            );

            checkmm.variables = new Set<string>(['ps', 'x']);

            checkmm.scopes = [
                {
                    activehyp: [],
                    activevariables: new Set<string>(),
                    floatinghyp: new Map(),
                    disjvars: [new Set<string>(['ps', 'x'])],
                },
            ];

            const result: Stack<Expression> = checkmm.verifyassertionref(
                'a17d',
                'ax-17',
                std.createstack([
                    ['wff', '(', 'ps', '->', 'A.', 'x', 'ps', ')'],
                    ['wff', 'ph'],
                    ['wff', 'ps'],
                    ['set', 'x'],
                ]),
            );

            expect(result.toArray()).toEqual([
                ['wff', '(', 'ps', '->', 'A.', 'x', 'ps', ')'],
                ['wff', 'ph'],
                ['|-', '(', 'ps', '->', 'A.', 'x', 'ps', ')'],
            ]);
        });
    });

    const initStateForTh1 = (tokens: Tokens) => {
        checkmm.hypotheses = new Map(
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
        );

        checkmm.assertions = new Map(
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
        );

        checkmm.constants = new Set(['(', ')', '+', '->', '0', '=', 'term', 'wff', '|-']);

        checkmm.variables = new Set<string>(['P', 'Q', 'r', 's', 't']);

        checkmm.tokens = tokens;

        checkmm.scopes = [
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
        ];
    };

    describe('verifyregularproof', () => {
        it('can verify regular proofs', () => {
            initStateForTh1(createTokenArray());

            const theorem: Assertion = {
                hypotheses: ['tt'],
                disjvars: new Set(),
                expression: ['|-', 't', '=', 't'],
            };

            const proof: string[] = (
                'tt tze tpl tt weq tt tt weq tt a2 tt tze tpl ' +
                'tt weq tt tze tpl tt weq tt tt weq wim tt a2 ' +
                'tt tze tpl tt tt a1 mp mp'
            ).split(' ');

            checkmm.verifyregularproof('th1', theorem, proof);
            // expect verifyregularproof not to throw
        });
    });

    describe('verifycompressedproof', () => {
        it('can verify compressed proofs', () => {
            const spy = jest.spyOn(checkmm, 'verifyassertionref');
            checkmm.verifyassertionref = spy as any;

            initStateForTh1(createTokenArray());

            const labels = 'tze tpl weq a2 wim a1 mp'.split(' ');
            const proofnumbers = checkmm.getproofnumbers('th1', 'ABCZADZAADZAEZJJKFLIAAGHH');

            const theorem: Assertion = {
                hypotheses: ['tt'],
                disjvars: new Set(),
                expression: ['|-', 't', '=', 't'],
            };

            checkmm.verifycompressedproof('th1', theorem, labels, proofnumbers);
            expect(spy).toHaveBeenCalledTimes(9);
        });
    });

    describe('parsep', () => {
        it('can parse $p statements for regular proofs', () => {
            initStateForTh1(
                createTokenArray(
                    ...(
                        '|- t = t $= tt tze tpl tt weq tt tt weq tt a2 tt tze tpl tt weq tt tze tpl tt weq tt tt weq ' +
                        'wim tt a2 tt tze tpl tt tt a1 mp mp $.'
                    )
                        .split(' ')
                        .reverse(),
                ),
            );

            checkmm.parsep('th1');
            // expect parsep not to throw
        });

        it('can parse $p statements for compressed proofs', () => {
            initStateForTh1(
                createTokenArray(
                    ...'|- t = t $= ( tze tpl weq a2 wim a1 mp ) ABCZADZAADZAEZJJKFLIAAGHH $.'.split(' ').reverse(),
                ),
            );

            checkmm.parsep('th1');
            // expect parsep not to throw
        });
    });

    it('can parse $c statements', () => {
        checkmm.tokens = createTokenArray(...'0 + = -> ( ) term wff |- $.'.split(' ').reverse());

        checkmm.parsec();
        // expect parsec not to throw
    });
});
