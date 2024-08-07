/* eslint-disable @typescript-eslint/no-explicit-any */
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const exec = promisify(child_process.exec);

interface ParsedFilename {
    isMM: boolean;
    expectedPass: boolean;
}

const parseFilename = (filename: string): ParsedFilename => {
    const pieces = filename.split('.');
    const ext = pieces.pop();
    const fileTitle = pieces.join('.');
    const titlePieces = fileTitle.split('-');
    const last = titlePieces.pop()!;

    const expectedPass: boolean = last.match('bad[1-9]*') ? false : true;

    return {
        isMM: ext === 'mm',
        expectedPass,
    };
};

const main = async (): Promise<number> => {
    const updateFromRepo = process.argv.filter(value => value === '--no-update').length === 0;

    const repoPath = path.join(__dirname, 'metamath-test');
    let stats: fs.Stats | undefined = undefined;

    try {
        stats = await stat(repoPath);
    } catch (err: any) {
        if (err.code !== 'ENOENT') {
            console.error(err);
            return 1;
        }
    }

    if (updateFromRepo) {
        if (stats) {
            const { stdout, stderr } = await exec('git pull', {
                cwd: repoPath,
            });

            console.log(stdout);
            console.log(stderr);
        } else {
            const { stdout, stderr } = await exec('git clone https://github.com/david-a-wheeler/metamath-test.git', {
                cwd: __dirname,
            });

            console.log(stdout);
            console.log(stderr);
        }
    }

    const filenames = await readdir(repoPath);

    for (const filename of filenames) {
        const { isMM, expectedPass } = parseFilename(filename);

        if (isMM) {
            const cmd = `npm start test/metamath-test/${filename}`;
            console.log(cmd);
            let okay = false;

            try {
                const { stderr } = await exec(cmd, { cwd: path.join(__dirname, '..') });
                if (stderr.length) {
                    console.log(stderr);
                }
                okay = true;
            } catch (_e) {
                // continue and handle error below
            }

            if (okay === false && expectedPass === true) {
                console.error('Expected pass but failed');
                return 1;
            } else if (okay === true && expectedPass === false) {
                console.error('Expected fail but passed');
                return 1;
            }
        }
    }

    return 0;
};

main().then(exitCode => {
    process.exitCode = exitCode;
});
