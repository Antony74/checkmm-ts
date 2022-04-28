import { it, expect, describe } from '@jest/globals';
import checkmm, { Assertion, Hypothesis } from '../ts/checkmm';

describe('checkmm', () => {
    describe('labelused', () => {
        it('can determine if a label is used', () => {
            checkmm.setHypotheses(
                new Map<string, Hypothesis>(
                    Object.entries({
                        hello: {
                            first: ['my', 'hypothesis'],
                            second: false,
                        },
                    }),
                ),
            );

            checkmm.setAssertions(
                new Map<string, Assertion>(
                    Object.entries({
                        world: {
                            hypotheses: [],
                            disjvars: new Set(),
                            expression: [],
                        },
                    }),
                ),
            );

            expect(checkmm.labelused('hello')).toEqual(true);
            expect(checkmm.labelused('meaningless')).toEqual(false);
            expect(checkmm.labelused('world')).toEqual(true);
        });
    });
});
