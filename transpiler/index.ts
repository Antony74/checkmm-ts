import ts from 'typescript';
import fs from 'fs';
import { createNodeProcessor } from './processNode';

const inputFilename = `${__dirname}/../ts/checkmm.ts`;
const outputFilename = `${__dirname}/../output/checkmm_ugly.cpp`;

const options: ts.CompilerOptions = {
    noEmit: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
};

const program = ts.createProgram([inputFilename], options);
const typechecker = program.getTypeChecker();
const sourceFile = program.getSourceFile(inputFilename);

if (sourceFile) {
    const processNode = createNodeProcessor(sourceFile, typechecker);
    const code = processNode(sourceFile);
    fs.writeFileSync(outputFilename, code);
}
