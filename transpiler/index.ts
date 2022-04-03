import ts from 'typescript';
import fs from 'fs';
import { processNode } from './processNode';

const inputFilename = `${__dirname}/../ts/checkmm.ts`;
const outputFilename = `${__dirname}/../output/checkmm_ugly.cpp`;

const sourceFile: ts.Node = ts.createSourceFile(
    inputFilename,
    fs.readFileSync(inputFilename).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true,
);

const code = processNode(sourceFile);

fs.writeFileSync(outputFilename, code);
