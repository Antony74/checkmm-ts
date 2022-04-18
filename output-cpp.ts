// Remove const and inline statements from C++ as these are just nice optimisations with no direct analog in TypeScript.
import fs from 'fs';

const inputFilename = `${__dirname}/cpp/checkmm.cpp`;
const outputFilename = `${__dirname}/output/checkmm_ugly.cpp`;

let code: string = fs.readFileSync(inputFilename, { encoding: 'utf8' });

// Strip all const keywords unless it is followed by '&' (i.e. a reference)
code = code
    .split(' const ')
    .map(piece => {
        if (piece.trimStart()[0] === '&') {
            return 'const' + piece;
        } else {
            return piece;
        }
    })
    .join(' ');

// Strip all inline keywords
code = code.split('inline ').join(' ');

fs.writeFileSync(outputFilename, code);
