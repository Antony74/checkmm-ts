import ts, { SyntaxKind } from 'typescript';
import fs from 'fs';

const inputFilename = `${__dirname}/../ts/checkmm.ts`;
const outputFilename = `${__dirname}/../output/checkmm_ugly.cpp`;

const sourceFile: ts.Node = ts.createSourceFile(
    inputFilename,
    fs.readFileSync(inputFilename).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true,
);

const getComment = (node: ts.Node): string => {
    const fullText = node.getFullText();
    const comment = fullText.slice(0, fullText.length - node.getText().length);
    return comment;
};

const hackBannerComment = (lines: string[]): string => {
    lines[1] = '// Eric Schmidt (eric41293@comcast.net)';
    lines[8] = '// This is a standalone verifier for Metamath database files,';
    lines[9] = '// written in portable C++. Run it with a single file name as the';
    lines[10] = '// parameter.';
    lines[12] = '';
    lines[13] = '';
    lines[14] = '';
    lines[33] = '';

    const includes = [
        'algorithm',
        'cctype',
        'cstdlib',
        'deque',
        'fstream',
        'iostream',
        'iterator',
        'limits',
        'map',
        'queue',
        'set',
        'string',
        'utility',
        'vector',
    ].map(filename => `#include <${filename}>`);

    return [...lines.filter(line => line.length), '', ...includes].join('\n');
};

const processNode = (node: ts.Node) => {
    let returnValue = '';
    console.log(node.kind);

    let comment = '';

    if (node.parent && node !== node.parent.getChildAt(0)) {
        comment = getComment(node);
        const lines = comment.split('\n');

        if (lines.length === 36) {
            comment = hackBannerComment(lines);
        }
    }

    switch (node.kind) {
        case SyntaxKind.SourceFile:
        case SyntaxKind.SyntaxList:
        case SyntaxKind.TypeReference:
            returnValue = node.getChildren().map(processNode).join('');
            break;
        case SyntaxKind.ImportDeclaration:
            break;
        case SyntaxKind.EndOfFileToken:
            break;
        case SyntaxKind.QualifiedName:
            switch (node.getText()) {
                case 'std.Pair':
                    returnValue = 'std::pair';
                    break;
                default:
                    returnValue = node.getText();
            }
            break;
        case SyntaxKind.Identifier:
            switch (node.getText()) {
                case 'Array':
                    returnValue = 'std::vector';
                    break;
                default:
                    returnValue = node.getText();
            }
            break;
        case SyntaxKind.StringKeyword:
            returnValue = 'std::string';
            break;
        case SyntaxKind.BooleanKeyword:
            returnValue = 'bool';
            break;
        case SyntaxKind.EqualsToken:
        case SyntaxKind.LessThanToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.CommaToken:
            returnValue = node.getText();
            break;
        case SyntaxKind.TypeAliasDeclaration:
            if (node.getChildCount() === 5) {
                const [typeKeyword, identifer, equalsToken, typeReference, semicolonToken] = node.getChildren();
                if (
                    typeKeyword.kind === SyntaxKind.TypeKeyword &&
                    identifer.kind === SyntaxKind.Identifier &&
                    equalsToken.kind === SyntaxKind.EqualsToken &&
                    typeReference.kind === SyntaxKind.TypeReference &&
                    semicolonToken.kind === SyntaxKind.SemicolonToken
                ) {
                    returnValue = `typedef ${processNode(typeReference)} ${identifer.getText()};`;
                } else {
                    throw new Error(`Unrecognised TypeAliasDeclaration`);
                }
            } else {
                throw new Error(`Unrecognised TypeAliasDeclaration.  Expected 5 children`);
            }
            break;
        default:
            throw new Error(`node.kind ${node.kind} node yet supported`);
    }

    console.log(returnValue);
    return comment + returnValue;
};

const code = processNode(sourceFile);

fs.writeFileSync(outputFilename, code);
