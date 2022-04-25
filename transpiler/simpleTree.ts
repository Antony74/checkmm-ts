import ts, { SyntaxKind } from 'typescript';

interface SimpleTree {
    kind: string;
    children?: SimpleTree[];
    text?: string;
}

export const simpleTreeCreator = (sourceFile: ts.SourceFile) => {
    const simpleTree = (node: ts.Node, recursionLimit: number, showText: boolean): SimpleTree => {
        return {
            kind: SyntaxKind[node.kind],
            children:
                recursionLimit > 0
                    ? node.getChildren(sourceFile).map(node => simpleTree(node, recursionLimit - 1, showText))
                    : undefined,
            text: showText ? node.getText(sourceFile): undefined,
        };
    };

    const simpleTreeString = (node: ts.Node, recursionLimit: number = 1, showText: boolean = false): string =>
        JSON.stringify(simpleTree(node, recursionLimit, showText), null, 2);

    return { simpleTreeString };
};
