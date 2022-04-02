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

const processNode = (node: ts.Node) => {
    let returnValue = '';
    console.log(node.kind);

    switch (node.kind) {
        case SyntaxKind.SourceFile:
        case SyntaxKind.SyntaxList:
            returnValue = node.getChildren().map(processNode).join('');
            break;
        case SyntaxKind.ImportDeclaration:
        case SyntaxKind.EndOfFileToken:
            break;
        case SyntaxKind.Identifier:
            console.log(`Identifier ${node.getText()}`);
            returnValue = node.getText();
            break;
        case SyntaxKind.EqualsToken:
            returnValue = node.getText();
            break;
        case SyntaxKind.TypeAliasDeclaration:
            console.log(`typedef ${node.getChildCount()}`);

            if (node.getChildCount() === 5) {
                const [typeKeyword, identifer, equalsToken, typeReference, semicolonToken] = node.getChildren();
                if (
                    typeKeyword.kind === SyntaxKind.TypeKeyword &&
                    identifer.kind === SyntaxKind.Identifier &&
                    equalsToken.kind === SyntaxKind.EqualsToken &&
                    typeReference.kind === SyntaxKind.TypeReference &&
                    semicolonToken.kind === SyntaxKind.SemicolonToken
                ) {
                    returnValue = `typedef ${typeReference.getText()} ${identifer.getText()};`;
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
    return returnValue;
};

const code = processNode(sourceFile);

fs.writeFileSync(outputFilename, code);


