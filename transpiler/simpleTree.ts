import ts, { SyntaxKind } from 'typescript';

interface SimpleTree {
    kind: string;
    children?: SimpleTree[];
}

export const simpleTreeCreator = (sourceFile: ts.SourceFile) => {
    const simpleTree = (node: ts.Node, recursionLimit: number = 10): SimpleTree => {
        return {
            kind: SyntaxKind[node.kind],
            children:
                recursionLimit > 0
                    ? node.getChildren(sourceFile).map(node => simpleTree(node, recursionLimit - 1))
                    : undefined,
        };
    };

    const simpleTreeString = (node: ts.Node): string => JSON.stringify(simpleTree(node), null, 2);
    const simpleFlatTreeString = (node: ts.Node): string => JSON.stringify(simpleTree(node, 1), null, 2);

    return { simpleTreeString, simpleFlatTreeString };
};
