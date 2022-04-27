import ts, { SyntaxKind } from 'typescript';
import { hackBannerComment } from './hackBannerComment';
import { simpleTreeCreator } from './simpleTree';

interface ContainerVariable {
    name: string;
    itemName: string;
    iteratorName: string;
}

// I'm going to need something more like a proper stack here
const containerVariables: ContainerVariable[] = [];

export const createNodeProcessor = (sourceFile: ts.SourceFile, typechecker: ts.TypeChecker) => {
    const { simpleTreeString } = simpleTreeCreator(sourceFile);

    const processChildren = (node: ts.Node): string => node.getChildren(sourceFile).map(processNode).join('');

    const getComment = (node: ts.Node): string => {
        const fullText = node.getFullText(sourceFile);
        let comment = fullText.slice(0, fullText.length - node.getText(sourceFile).length);
        return comment;
    };

    const getAndValidateKinds = (node: ts.Node, kinds: (SyntaxKind | string)[]): { [key: string]: ts.Node } => {
        const returnValue: { [key: string]: ts.Node } = {};

        if (node.getChildCount(sourceFile) !== kinds.length) {
            console.log(simpleTreeString(node));
            throw new Error(`Unrecognised ${SyntaxKind[node.kind]}.  Expected ${kinds.length} children`);
        }

        node.getChildren().forEach((child, index) => {
            if (typeof kinds[index] === 'string') {
                const key = kinds[index];
                returnValue[key] = child;
            } else if (child.kind !== kinds[index]) {
                console.log(simpleTreeString(node));
                throw new Error(`Unrecognised ${SyntaxKind[node.kind]}.`);
            } else {
                for (let n = 0; true; ++n) {
                    const kind = SyntaxKind[child.kind];
                    const key = kind[0].toLowerCase() + kind.slice(1) + (n ? `${n + 1}` : ``);
                    if (!returnValue[key]) {
                        returnValue[key] = child;
                        break;
                    }
                }
            }
        });

        return returnValue;
    };

    const getKinds = (node: ts.Node, kinds: (SyntaxKind | string)[]): { [key: string]: ts.Node } => {
        try {
            return getAndValidateKinds(node, kinds);
        } catch (e) {
            return {};
        }
    };

    const mapTypes = (object: ts.Node, methodName?: string) => {
        const objectType = typechecker.getTypeAtLocation(object);
        let objectTypeName = objectType.symbol.escapedName.toString();
        let suffix = '';
        if (objectTypeName === 'Map' && methodName === 'get') {
            objectTypeName = 'std::map';
            methodName = 'find';
            suffix = '::const_iterator';
        }

        const templateArgs: { intrinsicName: string }[] = (objectType as any).resolvedTypeArguments;
        if (templateArgs && templateArgs.length) {
            objectTypeName += `<${templateArgs
                .map(arg => arg.intrinsicName)
                .map(name => (name === 'string' ? 'std::string' : name))
                .join(',')}>`;
        }
        objectTypeName += suffix;
        return { objectTypeName, mappedMethodName: methodName };
    };

    interface CallExpression {
        text: string;
        objectTypeName: string;
        objectText: string;
    }

    const processCallExpression = (callExpression: ts.Node): CallExpression => {
        if (callExpression.kind !== SyntaxKind.CallExpression) {
            throw new Error('Expected CallExpression');
        }

        const { propertyAccessExpression, syntaxList } = getKinds(callExpression, [
            SyntaxKind.PropertyAccessExpression,
            SyntaxKind.OpenParenToken,
            SyntaxKind.SyntaxList,
            SyntaxKind.CloseParenToken,
        ]);

        if (propertyAccessExpression && propertyAccessExpression.getChildCount(sourceFile) === 3) {
            const { object, identifier } = getAndValidateKinds(propertyAccessExpression, [
                'object',
                SyntaxKind.DotToken,
                SyntaxKind.Identifier,
            ]);

            let methodName = identifier.getText(sourceFile);
            const { objectTypeName, mappedMethodName } = mapTypes(object, methodName);

            return {
                text: `${processNode(object)}.${mappedMethodName}(${processNode(syntaxList)})`,
                objectTypeName,
                objectText: processNode(object),
            };
        }

        return { text: processChildren(callExpression), objectTypeName: '', objectText: '' };
    };

    let lastItemWasBlock = false;

    const processNode = (node: ts.Node): string => {
        let returnValue = '';

        let comment = '';

        if (
            node.kind !== SyntaxKind.SourceFile &&
            node.kind !== SyntaxKind.SyntaxList &&
            node.kind !== SyntaxKind.FirstStatement &&
            node.kind !== SyntaxKind.VariableDeclarationList &&
            node.kind !== SyntaxKind.ReturnStatement
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
                returnValue = processChildren(node);
                lastItemWasBlock = true;
                break;
            case SyntaxKind.SourceFile:
                returnValue = processChildren(node);
                console.log(containerVariables);
                break;
            case SyntaxKind.SyntaxList:
            case SyntaxKind.TypeReference:
            case SyntaxKind.VariableStatement:
            case SyntaxKind.VariableDeclarationList:
            case SyntaxKind.ReturnStatement:
            case SyntaxKind.IfStatement:
                returnValue = processChildren(node);
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
            case SyntaxKind.IfKeyword:
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
                    case 'vari':
                        returnValue = 'var'; // Reserved word in TypeScript but a valid variable name that is used in the C++ code
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
                {
                    const { identifier, typeReference } = getAndValidateKinds(node, [
                        SyntaxKind.TypeKeyword,
                        SyntaxKind.Identifier,
                        SyntaxKind.EqualsToken,
                        SyntaxKind.TypeReference,
                        SyntaxKind.SemicolonToken,
                    ]);

                    returnValue = `typedef ${processNode(typeReference)} ${identifier.getText(sourceFile)};`;
                }
                break;
            case SyntaxKind.VariableDeclaration:
                if (node.getChildCount(sourceFile) === 5) {
                    const { identifier, variableType, value } = getAndValidateKinds(node, [
                        SyntaxKind.Identifier,
                        SyntaxKind.ColonToken,
                        'variableType',
                        SyntaxKind.FirstAssignment,
                        'value',
                    ]);

                    if (value.kind === SyntaxKind.ArrayLiteralExpression && value.getChildCount(sourceFile) === 3) {
                        const { syntaxList } = getAndValidateKinds(value, [
                            SyntaxKind.OpenBracketToken,
                            SyntaxKind.SyntaxList,
                            SyntaxKind.CloseBracketToken,
                        ]);

                        if (syntaxList.getChildCount() === 0) {
                            returnValue = `${processNode(variableType)} ${identifier.getText(sourceFile)}`;
                        } else {
                            throw new Error(
                                `Unrecognised ArrayLiteralExperssion in VariableDeclaration, expected empty SyntaxList.`,
                            );
                        }
                    }
                } else if (node.getChildCount(sourceFile) === 3) {
                    const { identifier, value } = getAndValidateKinds(node, [
                        SyntaxKind.Identifier,
                        SyntaxKind.EqualsToken,
                        'value',
                    ]);

                    const identifierText = identifier.getText(sourceFile);

                    switch (value.kind) {
                        case SyntaxKind.NewExpression:
                            const newExpression = value.getChildren(sourceFile).slice(1, -3);
                            returnValue = `${newExpression.map(processNode).join('')} ${identifierText}`;
                            break;
                        case SyntaxKind.ArrowFunction:
                            const { syntaxList, returnType, block } = getAndValidateKinds(value, [
                                SyntaxKind.OpenParenToken,
                                SyntaxKind.SyntaxList,
                                SyntaxKind.CloseParenToken,
                                SyntaxKind.ColonToken,
                                'returnType',
                                SyntaxKind.EqualsGreaterThanToken,
                                SyntaxKind.Block,
                            ]);

                            const parameters = syntaxList
                                .getChildren(sourceFile)
                                .map(parameter => {
                                    if (parameter.kind !== SyntaxKind.Parameter) {
                                        throw new Error(`Expected parameter`);
                                    }
                                    return processNode(parameter);
                                })
                                .join(',');

                            returnValue = `${processNode(returnType)} ${identifierText}(${parameters})${processNode(
                                block,
                            )}`;
                            break;
                        case SyntaxKind.CallExpression:
                            const { text, objectTypeName, objectText } = processCallExpression(value);
                            returnValue = `${objectTypeName} ${identifierText}(${text})`;
                            containerVariables.push({ name: objectText, iteratorName: identifierText, itemName: '' });
                            break;
                        default:
                            console.log(simpleTreeString(value));
                            throw new Error(`Unrecognised VariableDeclaration value`);
                    }
                }
                break;
            case SyntaxKind.PropertyAccessExpression:
                {
                    const { object, identifier } = getAndValidateKinds(node, [
                        'object',
                        SyntaxKind.DotToken,
                        SyntaxKind.Identifier,
                    ]);

                    switch (object.kind) {
                        case SyntaxKind.Identifier:
                            let identifierText = object.getText(sourceFile);
                            let accessorToken = identifierText === 'std' ? '::' : '.';

                            for (const container of containerVariables) {
                                if (container.itemName === identifierText) {
                                    identifierText = `${container.iteratorName}`;
                                    accessorToken = '->';
                                    break;
                                }
                            }

                            returnValue = `${identifierText}${accessorToken}${processNode(identifier)}`;
                            break;
                        case SyntaxKind.PropertyAccessExpression:
                            returnValue = `${processNode(object)}.${processNode(identifier)}`;
                            break;
                        default:
                            console.log(simpleTreeString(node));
                            throw new Error(`Unrecognised PropertyAccessExpression`);
                    }
                }
                break;
            case SyntaxKind.InterfaceDeclaration:
                {
                    const { identifier, syntaxList } = getAndValidateKinds(node, [
                        SyntaxKind.InterfaceKeyword,
                        SyntaxKind.Identifier,
                        SyntaxKind.FirstPunctuation,
                        SyntaxKind.SyntaxList,
                        SyntaxKind.CloseBraceToken,
                    ]);

                    returnValue = `struct ${identifier.getText(sourceFile)} {${processNode(syntaxList)}};`;
                }
                break;
            case SyntaxKind.PropertySignature:
                {
                    const { identifier, typeReference } = getAndValidateKinds(node, [
                        SyntaxKind.Identifier,
                        SyntaxKind.ColonToken,
                        'typeReference',
                        SyntaxKind.SemicolonToken,
                    ]);

                    if (
                        typeReference.kind === SyntaxKind.TypeReference ||
                        typeReference.kind === SyntaxKind.ArrayType
                    ) {
                        returnValue = `${processNode(typeReference)} ${identifier.getText(sourceFile)};`;
                    } else {
                        console.log(simpleTreeString(node));
                        throw new Error(`Unrecognised PropertySignature.`);
                    }
                }
                break;
            case SyntaxKind.ArrayType:
                const { keyword } = getAndValidateKinds(node, [
                    'keyword',
                    SyntaxKind.OpenBracketToken,
                    SyntaxKind.CloseBracketToken,
                ]);
                returnValue = `std::vector<${processNode(keyword)}>`;
                break;
            case SyntaxKind.Parameter:
                {
                    const { identifier, paramType } = getAndValidateKinds(node, [
                        SyntaxKind.Identifier,
                        SyntaxKind.ColonToken,
                        'paramType',
                    ]);

                    returnValue = `${processNode(paramType)} ${processNode(identifier)}`;
                }
                break;
            case SyntaxKind.BinaryExpression:
                if (node.getChildCount(sourceFile) === 3) {
                    const [left, operator, right] = node.getChildren(sourceFile);
                    if (
                        operator.kind === SyntaxKind.EqualsEqualsEqualsToken ||
                        operator.kind === SyntaxKind.ExclamationEqualsEqualsToken
                    ) {
                        if (left.kind === SyntaxKind.CallExpression) {
                            const { propertyAccessExpression, syntaxList } = getKinds(left, [
                                SyntaxKind.PropertyAccessExpression,
                                SyntaxKind.OpenParenToken,
                                SyntaxKind.SyntaxList,
                                SyntaxKind.CloseParenToken,
                            ]);
                            if (
                                propertyAccessExpression &&
                                propertyAccessExpression.kind === SyntaxKind.PropertyAccessExpression &&
                                propertyAccessExpression.getChildCount(sourceFile) === 3
                            ) {
                                let rightText = processNode(right);

                                const { identifier, identifier2 } = getAndValidateKinds(propertyAccessExpression, [
                                    SyntaxKind.Identifier,
                                    SyntaxKind.DotToken,
                                    SyntaxKind.Identifier,
                                ]);

                                const object = identifier;
                                const method = identifier2;

                                const containerType = typechecker.getTypeAtLocation(object);
                                const objectTypeName = containerType.symbol.escapedName;
                                let methodName = method.getText(sourceFile);
                                if (objectTypeName === 'Map' && methodName === 'get') {
                                    methodName = 'find';

                                    if (rightText.trim() === 'undefined') {
                                        rightText = `${processNode(object)}.end()`;
                                    }
                                }

                                return `${processNode(object)}.${methodName} (${processNode(syntaxList)}) ${processNode(
                                    operator,
                                )} ${rightText}`;
                            }
                        } else if (right.getText(sourceFile) === 'undefined') {
                            const leftText = left.getText(sourceFile);
                            for (const container of containerVariables) {
                                if (container.iteratorName === leftText) {
                                    return `${leftText} ${processNode(operator)} ${container.name}.end()`;
                                }
                            }
                        }
                    }
                }
                returnValue = processChildren(node);
                break;
            case SyntaxKind.ForOfStatement:
                {
                    const { variableDeclarationList, identifier, code } = getAndValidateKinds(node, [
                        SyntaxKind.ForKeyword,
                        SyntaxKind.OpenParenToken,
                        SyntaxKind.VariableDeclarationList,
                        SyntaxKind.OfKeyword,
                        SyntaxKind.Identifier,
                        SyntaxKind.CloseParenToken,
                        'code',
                    ]);

                    const containerType = typechecker.getTypeAtLocation(identifier);
                    const containerTypeName = containerType.symbol.escapedName;
                    const identifierText = identifier.getText(sourceFile);

                    const { syntaxList } = getAndValidateKinds(variableDeclarationList, [
                        SyntaxKind.ConstKeyword,
                        SyntaxKind.SyntaxList,
                    ]);

                    const { variableDeclaration } = getAndValidateKinds(syntaxList, [SyntaxKind.VariableDeclaration]);
                    const itemName = variableDeclaration.getText(sourceFile);

                    const itemType = typechecker.getTypeAtLocation(variableDeclaration);
                    const itemTypeName = itemType.symbol.escapedName;

                    if (containerTypeName === 'Array') {
                        containerVariables.push({ name: identifierText, itemName, iteratorName: 'iter' });
                        returnValue = `for (std::vector<${itemTypeName}>::const_iterator iter(${identifierText}.begin()); iter != ${identifierText}.end(); ++iter) ${processNode(
                            code,
                        )}`;
                    } else {
                        throw new Error(`Unrecognised container in ForOfStatement`);
                    }
                }
                break;
            case SyntaxKind.StringLiteral:
                const string = node.getText(sourceFile).slice(1, -1);
                if (string.length) {
                    returnValue = `"${string}"`;
                } else {
                    returnValue = 'std::string()'; // Just a quirk I intend to support
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
