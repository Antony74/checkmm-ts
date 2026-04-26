import { describe, expect, it, jest } from '@jest/globals';
import { checkText } from '../src/checkText';
import { getCheckmmState } from '../src/state';

const includeeArray = [
    '$( demo0-includee.mm  1-Jan-04 $)',
    '$c 0 + = -> ( ) term wff |- $.',
    '$v t r s P Q $.',
    'tt $f term t $.',
    'tr $f term r $.',
    'ts $f term s $.',
    'wp $f wff P $.',
    'wq $f wff Q $.',
    'tze $a term 0 $.',
    'tpl $a term ( t + r ) $.',
    'weq $a wff t = r $.',
    'wim $a wff ( P -> Q ) $.',
    'a1 $a |- ( t = r -> ( t = s -> r = s ) ) $.',
    'a2 $a |- ( t + 0 ) = t $.',
    '${',
    '   min $e |- P $.',
    '   maj $e |- ( P -> Q ) $.',
    '   mp  $a |- Q $.',
    '$}',
];

const includee = includeeArray.join('\n');

const includerArray = [
    '$( demo0-includer.mm  1-Jan-04 $)',
    '$[ demo0-includee.mm $]',
    'th1 $p |- t = t $=',
    '   tt tze tpl tt weq tt tt weq tt a2 tt tze tpl',
    '   tt weq tt tze tpl tt weq tt tt weq wim tt a2',
    '   tt tze tpl tt tt a1 mp mp',
    '$.',
];

const includer = includerArray.join('\n');

const singleBlock = [...includeeArray, ...includerArray.slice(2)].join('\n');

describe(`checkText`, () => {
    it(`can validate a single block of text`, async () => {
        await checkText(singleBlock);
        expect(getCheckmmState().hypotheses.size).toEqual(7);
    });

    it(`can validate a block of text with inclusions`, async () => {
        const readIncludedFile = jest
            .fn<(filename: string) => Promise<string>>()
            .mockImplementation(async () => includee);

        await checkText(includer, readIncludedFile);
        expect(getCheckmmState().hypotheses.size).toEqual(7);
        expect(readIncludedFile).toHaveBeenCalledTimes(1);
        expect(readIncludedFile).toHaveBeenCalledWith('demo0-includee.mm');
    });

    it(`complains if a readIncludedFile callback is needed but not provided`, async () => {
        await expect(checkText(includer)).rejects.toEqual(
            new Error('checkText: $[ demo0-includee.mm $] encountered but readIncludedFile was not specified'),
        );
    });

    it(`raises errors in the main text`, async () => {
        await expect(checkText('z')).rejects.toEqual(new Error('Unfinished labeled statement'));
    });

    it(`raises errors in inclusions`, async () => {
        await expect(checkText(includer, async () => includer)).rejects.toEqual(
            new Error('First symbol in $p statement th1 is |- which is not a constant'),
        );
    });
});
