import ts, { SyntaxKind } from 'typescript';

interface SimpleTree {
    kind: string;
    children: SimpleTree[];
}

const kindToString = (kind: SyntaxKind): string => {
    switch (kind) {
        case SyntaxKind.VariableStatement:
            return 'VariableStatement';
        case SyntaxKind.VariableDeclarationList:
            return 'VariableDeclarationList';
        case SyntaxKind.SemicolonToken:
            return 'SemicolonToken';
        case SyntaxKind.ConstKeyword:
            return 'ConstKeyword';
        case SyntaxKind.SyntaxList:
            return 'SyntaxList';
        case SyntaxKind.VariableDeclaration:
            return 'VariableDeclaration';
        case SyntaxKind.Identifier:
            return 'Identifier';
        case SyntaxKind.EqualsToken:
            return 'EqualsToken';
        case SyntaxKind.NewExpression:
            return 'NewExpression';
        case SyntaxKind.NewKeyword:
            return 'NewKeyword';
        case SyntaxKind.LessThanToken:
            return 'LessThanToken';
        case SyntaxKind.GreaterThanToken:
            return 'GreaterThanToken';
        case SyntaxKind.OpenParenToken:
            return 'OpenParenToken';
        case SyntaxKind.CloseParenToken:
            return 'CloseParenToken';
        case SyntaxKind.StringKeyword:
            return 'StringKeyword';
        case SyntaxKind.SourceFile:
            return 'SourceFile';
        case SyntaxKind.ImportDeclaration:
            return 'ImportDeclaration';
        default:
            return '';
    }
};

export const kindString = (kind: SyntaxKind): string => {
    const s = kindToString(kind);
    return s ? s : `${kind}`;
};

export const simpleTree = (node: ts.Node): SimpleTree => {
    return { kind: kindString(node.kind), children: node.getChildren().map(simpleTree) };
};

export const simpleTreeString = (node: ts.Node): string => JSON.stringify(simpleTree(node), null, 2);
