import ts, { SyntaxKind } from 'typescript';
import { hackBannerComment } from './hackBannerComment';
import { simpleTreeString } from './simpleTree';

const getComment = (node: ts.Node): string => {
    const fullText = node.getFullText();
    const comment = fullText.slice(0, fullText.length - node.getText().length);
    return comment;
};

export const processNode = (node: ts.Node) => {
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
        case SyntaxKind.VariableStatement:
        case SyntaxKind.VariableDeclarationList:
            returnValue = node.getChildren().map(processNode).join('');
            break;
        case SyntaxKind.ImportDeclaration:
        case SyntaxKind.EndOfFileToken:
        case SyntaxKind.ConstKeyword:
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
                case 'Map':
                    returnValue = 'std::map';
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
        case SyntaxKind.SemicolonToken:
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
        case SyntaxKind.VariableDeclaration:
            if (node.getChildCount() === 3) {
                const [varableName, equalsToken, expression] = node.getChildren();

                if (varableName.kind === SyntaxKind.Identifier && equalsToken.kind === SyntaxKind.EqualsToken) {
                    if (expression.kind === SyntaxKind.NewExpression) {
                        const newExpression = expression.getChildren().slice(1, -3);
                        returnValue = `${newExpression.map(processNode).join('')} ${varableName.getText()}`;
                    }
                } else {
                    throw new Error(`Unrecognised VariableDeclaration.`);
                }
            } else {
                throw new Error(`Unrecognised VariableDeclaration.  Expected 3 children`);
            }
            break;
        default:
            console.log(simpleTreeString(node));
            throw new Error(`node.kind ${node.kind} node yet supported.  ${node.getText()}`);
    }

    return comment + returnValue;
};
