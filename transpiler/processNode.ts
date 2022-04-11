import ts, { SyntaxKind } from 'typescript';
import { hackBannerComment } from './hackBannerComment';
import { simpleTreeCreator } from './simpleTree';

export const createNodeProcessor = (sourceFile: ts.SourceFile, typechecker: ts.TypeChecker) => {
    const { simpleTreeString } = simpleTreeCreator(sourceFile);

    const getComment = (node: ts.Node): string => {
        const fullText = node.getFullText(sourceFile);
        let comment = fullText.slice(0, fullText.length - node.getText(sourceFile).length);

        // if (comment.trim().length) {
        //     comment += `// ${SyntaxKind[node.kind]}` + '\n';
        // }

        return comment;
    };

    let lastItemWasBlock = false;

    const processNode = (node: ts.Node) => {
        let returnValue = '';
        console.log(SyntaxKind[node.kind]);

        let comment = '';

        if (
            node.kind !== SyntaxKind.SourceFile &&
            node.kind !== SyntaxKind.SyntaxList &&
            node.kind !== SyntaxKind.FirstStatement &&
            node.kind !== SyntaxKind.VariableDeclarationList
        ) {
            comment = getComment(node);
            const lines = comment.split('\n');

            if (lines.length === 36) {
                comment = hackBannerComment(lines);
            }
        }

        if (node.kind !== SyntaxKind.SemicolonToken) {
            lastItemWasBlock = false;
        }

        switch (node.kind) {
            case SyntaxKind.Block:
                returnValue = node.getChildren(sourceFile).map(processNode).join('');
                lastItemWasBlock = true;
                break;
            case SyntaxKind.SourceFile:
            case SyntaxKind.SyntaxList:
            case SyntaxKind.TypeReference:
            case SyntaxKind.VariableStatement:
            case SyntaxKind.VariableDeclarationList:
            case SyntaxKind.ReturnStatement:
            case SyntaxKind.CallExpression:
                returnValue = node.getChildren(sourceFile).map(processNode).join('');
                break;
            case SyntaxKind.ImportDeclaration:
            case SyntaxKind.EndOfFileToken:
            case SyntaxKind.ConstKeyword:
                break;
            case SyntaxKind.EqualsToken:
            case SyntaxKind.LessThanToken:
            case SyntaxKind.GreaterThanToken:
            case SyntaxKind.CommaToken:
            case SyntaxKind.FirstPunctuation:
            case SyntaxKind.ReturnKeyword:
            case SyntaxKind.OpenParenToken:
            case SyntaxKind.CloseParenToken:
            case SyntaxKind.BarBarToken:
            case SyntaxKind.CloseBraceToken:
                returnValue = node.getText(sourceFile);
                break;
            case SyntaxKind.SemicolonToken:
                if (!lastItemWasBlock) {
                    returnValue = node.getText(sourceFile);
                }
                break;
            case SyntaxKind.QualifiedName:
                switch (node.getText(sourceFile)) {
                    case 'std.Pair':
                        returnValue = 'std::pair';
                        break;
                    case 'std.Deque':
                        returnValue = 'std::deque';
                        break;
                    default:
                        returnValue = node.getText(sourceFile);
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
            case SyntaxKind.ExclamationEqualsEqualsToken:
                returnValue = '!=';
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
                if (node.getChildCount(sourceFile) === 5) {
                    const [varableName, colonToken, variableType, firstAssignment, value] =
                        node.getChildren(sourceFile);

                    if (
                        varableName.kind === SyntaxKind.Identifier &&
                        colonToken.kind === SyntaxKind.ColonToken &&
                        firstAssignment.kind === SyntaxKind.FirstAssignment
                    ) {
                        if (value.kind === SyntaxKind.ArrayLiteralExpression && value.getChildCount(sourceFile) === 3) {
                            const [openBracketToken, syntaxList, closeBracketToken] = value.getChildren(sourceFile);
                            if (
                                openBracketToken.kind === SyntaxKind.OpenBracketToken &&
                                syntaxList.kind === SyntaxKind.SyntaxList &&
                                closeBracketToken.kind === SyntaxKind.CloseBracketToken &&
                                syntaxList.getChildCount() === 0
                            ) {
                                returnValue = `${processNode(variableType)} ${varableName.getText(sourceFile)}`;
                            } else {
                                throw new Error(
                                    `Unrecognised ArrayLiteralExperssion in VariableDeclaration with 5 children.`,
                                );
                            }
                        } else {
                            throw new Error(`Unrecognised VariableDeclaration with 5 children.`);
                        }
                    } else {
                        throw new Error(`Unrecognised VariableDeclaration with 5 children.`);
                    }
                } else if (node.getChildCount(sourceFile) === 3) {
                    const [varableName, equalsToken, value] = node.getChildren(sourceFile);

                    if (varableName.kind === SyntaxKind.Identifier && equalsToken.kind === SyntaxKind.EqualsToken) {
                        switch (value.kind) {
                            case SyntaxKind.NewExpression:
                                const newExpression = value.getChildren(sourceFile).slice(1, -3);
                                returnValue = `${newExpression.map(processNode).join('')} ${varableName.getText(
                                    sourceFile,
                                )}`;
                                break;
                            case SyntaxKind.ArrowFunction:
                                if (value.getChildCount(sourceFile) === 7) {
                                    const [
                                        openParenToken,
                                        syntaxList,
                                        closeParenToken,
                                        colonToken,
                                        returnType,
                                        equalsGreaterThanToken,
                                        block,
                                    ] = value.getChildren(sourceFile);

                                    if (
                                        openParenToken.kind === SyntaxKind.OpenParenToken &&
                                        syntaxList.kind === SyntaxKind.SyntaxList &&
                                        closeParenToken.kind === SyntaxKind.CloseParenToken &&
                                        colonToken.kind === SyntaxKind.ColonToken &&
                                        equalsGreaterThanToken.kind === SyntaxKind.EqualsGreaterThanToken &&
                                        block.kind === SyntaxKind.Block
                                    ) {
                                        const parameters = syntaxList
                                            .getChildren(sourceFile)
                                            .map(parameter => {
                                                if (parameter.kind !== SyntaxKind.Parameter) {
                                                    throw new Error(`Expected parameter`);
                                                }
                                                return processNode(parameter);
                                            })
                                            .join(',');

                                        returnValue = `${processNode(returnType)} ${varableName.getText(
                                            sourceFile,
                                        )}(${parameters})${processNode(block)}`;
                                    } else {
                                        throw new Error(`Unrecognised ArrowFunction.`);
                                    }
                                } else {
                                    throw new Error(`Unrecognised ArrowFunction.  Expected 7 children`);
                                }
                                break;
                            default:
                                console.log(simpleTreeString(node));
                                throw new Error(`Unrecognised VariableDeclaration value`);
                        }
                    } else {
                        throw new Error(`Unrecognised VariableDeclaration with 3 children.`);
                    }
                } else {
                    console.log(simpleTreeString(node));
                    throw new Error(`Unrecognised VariableDeclaration.  Expected 3 or 5 children`);
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
            case SyntaxKind.InterfaceDeclaration:
                if (node.getChildCount(sourceFile) === 5) {
                    const [interfaceKeyword, identifer, firstPunctuation, syntaxList, clostBraceToken] =
                        node.getChildren(sourceFile);

                    if (
                        interfaceKeyword.kind === SyntaxKind.InterfaceKeyword &&
                        identifer.kind === SyntaxKind.Identifier &&
                        firstPunctuation.kind === SyntaxKind.FirstPunctuation &&
                        syntaxList.kind === SyntaxKind.SyntaxList &&
                        clostBraceToken.kind === SyntaxKind.CloseBraceToken
                    ) {
                        returnValue = `struct ${identifer.getText(sourceFile)} {${processNode(syntaxList)}};`;
                    } else {
                        throw new Error(`Unrecognised InterfaceDeclaration.`);
                    }
                } else {
                    throw new Error(`Unrecognised InterfaceDeclaration.  Expected 5 children`);
                }
                break;
            case SyntaxKind.PropertySignature:
                if (node.getChildCount(sourceFile) === 4) {
                    const [identifier, colonToken, typeReference, semiColonToken] = node.getChildren(sourceFile);

                    if (
                        identifier.kind === SyntaxKind.Identifier &&
                        colonToken.kind === SyntaxKind.ColonToken &&
                        (typeReference.kind === SyntaxKind.TypeReference ||
                            typeReference.kind === SyntaxKind.ArrayType) &&
                        semiColonToken.kind === SyntaxKind.SemicolonToken
                    ) {
                        returnValue = `${processNode(typeReference)} ${identifier.getText(sourceFile)};`;
                    } else {
                        console.log(simpleTreeString(node));
                        throw new Error(`Unrecognised PropertySignature.`);
                    }
                } else {
                    throw new Error(`Unrecognised PropertySignature.  Expected 4 children`);
                }
                break;
            case SyntaxKind.ArrayType:
                if (node.getChildCount(sourceFile) === 3) {
                    const [keyword, openBracketToken, closeBracketToken] = node.getChildren(sourceFile);
                    if (
                        openBracketToken.kind === SyntaxKind.OpenBracketToken &&
                        closeBracketToken.kind === SyntaxKind.CloseBracketToken
                    ) {
                        returnValue = `std::vector<${processNode(keyword)}>`;
                    } else {
                        throw new Error(`Unrecognised ArrayType.`);
                    }
                } else {
                    throw new Error(`Unrecognised ArrayType.  Expected 3 children`);
                }
                break;
            case SyntaxKind.Parameter:
                if (node.getChildCount(sourceFile) === 3) {
                    const [identifer, colonToken, paramType] = node.getChildren(sourceFile);
                    if (identifer.kind === SyntaxKind.Identifier && colonToken.kind === SyntaxKind.ColonToken) {
                        returnValue = `${processNode(paramType)} ${identifer.getText(sourceFile)}`;
                    } else {
                        throw new Error(`Unrecognised Parameter`);
                    }
                } else {
                    throw new Error(`Unrecognised Parameter.  Expected 3 children`);
                }
                break;
            case SyntaxKind.BinaryExpression:
                let specialCase = false;
                if (node.getChildCount(sourceFile) === 3) {
                    const [left, operator, right] = node.getChildren(sourceFile);
                    if (
                        operator.kind === SyntaxKind.EqualsEqualsEqualsToken ||
                        operator.kind === SyntaxKind.ExclamationEqualsEqualsToken
                    ) {
                        if (left.kind === SyntaxKind.CallExpression && left.getChildCount(sourceFile) === 4) {
                            const [propertyAccessExpression, _openParenToken, syntaxList, _closeParenToken] =
                                left.getChildren();
                            if (
                                propertyAccessExpression.kind === SyntaxKind.PropertyAccessExpression &&
                                propertyAccessExpression.getChildCount(sourceFile) === 3
                            ) {
                                specialCase = true;
                                let rightText = processNode(right);
                                const [object, _dotToken, method] = propertyAccessExpression.getChildren();
                                const containerType = typechecker.getTypeAtLocation(object);
                                const objectTypeName = containerType.symbol.escapedName;
                                let methodName = method.getText(sourceFile);
                                if (objectTypeName === 'Map' && methodName === 'get') {
                                    methodName = 'find';

                                    if (rightText.trim() === 'undefined') {
                                        rightText = `${processNode(object)}.end()`;
                                    }
                                }

                                returnValue = `${processNode(object)}.${methodName} (${processNode(
                                    syntaxList,
                                )}) ${processNode(operator)} ${rightText}`;
                            }
                        }
                    }
                }
                if (!specialCase) {
                    returnValue = node.getChildren(sourceFile).map(processNode).join('');
                }
                break;
            default:
                console.log(simpleTreeString(node));
                throw new Error(`node.kind ${SyntaxKind[node.kind]} node yet supported.  ${node.getText(sourceFile)}`);
        }

        return comment + returnValue;
    };
    return processNode;
};
