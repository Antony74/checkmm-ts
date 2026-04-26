import checkmm from './checkmm';
import { resetState } from './state';

export const checkText = async (mainMmText: string, readIncludedFile?: (filename: string) => Promise<string>) => {
    resetState();

    const checkTextRecursive = async (filename: string, mmText: string, lastFileInclusionStart: number) => {
        const alreadyencountered: boolean = checkmm.mmfilenamesalreadyencountered.has(filename);
        if (alreadyencountered) {
            return;
        }

        checkmm.mmfilenamesalreadyencountered.add(filename);

        checkmm.data =
            checkmm.data.slice(0, lastFileInclusionStart) + mmText + checkmm.data.slice(checkmm.dataPosition);

        checkmm.dataPosition = lastFileInclusionStart;

        for (;;) {
            const fileInclusion = checkmm.readtokenstofileinclusion();
            if (fileInclusion) {
                if (!readIncludedFile) {
                    throw new Error(
                        `checkText: $[ ${fileInclusion.filename} $] encountered but readIncludedFile was not specified`,
                    );
                }

                await checkTextRecursive(
                    fileInclusion.filename,
                    await readIncludedFile(fileInclusion.filename),
                    fileInclusion.startPosition,
                );
            } else {
                break;
            }
        }
    };

    await checkTextRecursive('', mainMmText, 0);
    checkmm.processtokens();
};
