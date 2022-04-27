import { it, expect, describe, afterEach } from '@jest/globals';
import { hypotheses, assertions, labelused } from '../ts/checkmm';

describe('checkmm', () => {
    afterEach(() => {
        hypotheses.clear();
        assertions.clear();
    });

    describe('labelused', () => {
        it('can determine if a label is used', () => {
            hypotheses.set('hello', {
                first: ['my', 'hypothesis'],
                second: false,
            });

            assertions.set('world', {
                hypotheses: [],
                disjvars: new Set(),
                expression: [],
            });

            expect(labelused('hello')).toEqual(true);
            expect(labelused('meaningless')).toEqual(false);
            expect(labelused('world')).toEqual(true);
        });
    });
});
