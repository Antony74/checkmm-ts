import ts, { SyntaxKind } from 'typescript';
import { hackBannerComment } from './hackBannerComment';
import { kindString, simpleTreeCreator } from './simpleTree';

export const createNodeProcessor = (sourceFile: ts.SourceFile) => {
    const { simpleTreeString } = simpleTreeCreator(sourceFile);

    const getComment = (node: ts.Node): string => {
        const fullText = node.getFullText(sourceFile);
        const comment = fullText.slice(0, fullText.length - node.getText(sourceFile).length);
        return comment;
    };

    const processNode = (node: ts.Node) => {
        let returnValue = '';
        console.log(kindString(node.kind));

        let comment = '';

        if (node.kind !== SyntaxKind.SourceFile && node.kind !== SyntaxKind.ImportDeclaration) {
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
                returnValue = node.getChildren(sourceFile).map(processNode).join('');
                break;
            case SyntaxKind.ImportDeclaration:
            case SyntaxKind.EndOfFileToken:
            case SyntaxKind.ConstKeyword:
                break;
            case SyntaxKind.QualifiedName:
                switch (node.getText(sourceFile)) {
                    case 'std.Pair':
                        returnValue = 'std::pair';
                        break;
                    default:
                        returnValue = node.getText();
                }
                break;
            case SyntaxKind.Identifier:
                switch (node.getText(sourceFile)) {
                    case 'Array':
                        returnValue = 'std::vector';
                        break;
                    case 'Map':
                        returnValue = 'std::map';
                        break;
                    case 'Set':
                        returnValue = 'std::set';
                        break;
                    case 'Queue':
                        returnValue = 'queue';
                        break;
                    default:
                        returnValue = node.getText(sourceFile);
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
                returnValue = node.getText(sourceFile);
                break;
            case SyntaxKind.TypeAliasDeclaration:
                if (node.getChildCount(sourceFile) === 5) {
                    const [typeKeyword, identifer, equalsToken, typeReference, semicolonToken] =
                        node.getChildren(sourceFile);
                    if (
                        typeKeyword.kind === SyntaxKind.TypeKeyword &&
                        identifer.kind === SyntaxKind.Identifier &&
                        equalsToken.kind === SyntaxKind.EqualsToken &&
                        typeReference.kind === SyntaxKind.TypeReference &&
                        semicolonToken.kind === SyntaxKind.SemicolonToken
                    ) {
                        returnValue = `typedef ${processNode(typeReference)} ${identifer.getText(sourceFile)};`;
                    } else {
                        throw new Error(`Unrecognised TypeAliasDeclaration`);
                    }
                } else {
                    throw new Error(`Unrecognised TypeAliasDeclaration.  Expected 5 children`);
                }
                break;
            case SyntaxKind.VariableDeclaration:
                if (node.getChildCount(sourceFile) === 3) {
                    const [varableName, equalsToken, expression] = node.getChildren(sourceFile);

                    if (varableName.kind === SyntaxKind.Identifier && equalsToken.kind === SyntaxKind.EqualsToken) {
                        if (expression.kind === SyntaxKind.NewExpression) {
                            const newExpression = expression.getChildren(sourceFile).slice(1, -3);
                            returnValue = `${newExpression.map(processNode).join('')} ${varableName.getText(
                                sourceFile,
                            )}`;
                        }
                    } else {
                        throw new Error(`Unrecognised VariableDeclaration.`);
                    }
                } else {
                    throw new Error(`Unrecognised VariableDeclaration.  Expected 3 children`);
                }
                break;
            case SyntaxKind.PropertyAccessExpression:
                if (node.getChildCount(sourceFile) === 3) {
                    const [identifer1, dotToken, identifer2] = node.getChildren(sourceFile);
                    if (
                        identifer1.kind === SyntaxKind.Identifier &&
                        dotToken.kind === SyntaxKind.DotToken &&
                        identifer2.kind === SyntaxKind.Identifier
                    ) {
                        const identiferText = identifer1.getText(sourceFile);
                        const accessorToken = identiferText === 'std' ? '::' : '.';
                        returnValue = `${processNode(identifer1)}${accessorToken}${processNode(identifer2)}`;
                    } else {
                        throw new Error(`Unrecognised PropertyAccessExpression.`);
                    }
                } else {
                    throw new Error(`Unrecognised PropertyAccessExpression.  Expected 3 children`);
                }
                break;
            default:
                console.log(simpleTreeString(node));
                throw new Error(`node.kind ${kindString(node.kind)} node yet supported.  ${node.getText(sourceFile)}`);
        }

        return comment + returnValue;
    };
    return processNode;
};
