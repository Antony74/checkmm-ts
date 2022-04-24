import ts, { SyntaxKind } from 'typescript';

interface SimpleTree {
    kind: string;
    children?: SimpleTree[];
}

export const simpleTreeCreator = (sourceFile: ts.SourceFile) => {
    const simpleTree = (node: ts.Node, recursionLimit: number): SimpleTree => {
        return {
            kind: SyntaxKind[node.kind],
            children:
                recursionLimit > 0
                    ? node.getChildren(sourceFile).map(node => simpleTree(node, recursionLimit - 1))
                    : undefined,
        };
    };

    const simpleTreeString = (node: ts.Node, recursionLimit: number = 1): string =>
        JSON.stringify(simpleTree(node, recursionLimit), null, 2);

    return { simpleTreeString };
};
