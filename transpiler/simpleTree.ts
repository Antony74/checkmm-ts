import ts, { SyntaxKind } from 'typescript';

interface SimpleTree {
    kind: string;
    children: SimpleTree[];
}

export const simpleTreeCreator = (sourceFile: ts.SourceFile) => {
    const simpleTree = (node: ts.Node): SimpleTree => {
        return { kind: SyntaxKind[node.kind], children: node.getChildren(sourceFile).map(simpleTree) };
    };

    const simpleTreeString = (node: ts.Node): string => JSON.stringify(simpleTree(node), null, 2);

    return { simpleTree, simpleTreeString };
};
