import { createElement as _createElement, type JSXElementType, type AttributesArg } from "../../src/DOM";

export function createElement(tag: JSXElementType, attrs: AttributesArg = {}, ...children: HTMLElement[] ) {
    const attrKeys = Object.keys(attrs)
    const extendedAttr = Object.assign({}, attrs, {'data-test-attr-keys': attrKeys.join(',')})
    return _createElement(tag, extendedAttr, ...children)
}



class ThrowInfo {
    constructor(
        readonly received: any,
        readonly expected: any) {
    }
}

export function expect(received: any) {
    return {
        toEqual(expected: any) {
            if (received !== expected) throw new ThrowInfo(received, expected)

            return true
        }
    }
}



// TODO attrs match 还有 className  style dangerouslySetInnerHTML data 等特殊情况
export function partialMatch(inputTarget: any, toMatch: HTMLElement, context: string[] = []): boolean {
    try {
        console.log(inputTarget, toMatch)
        expect(inputTarget instanceof HTMLElement).toEqual(true)
        expect(toMatch instanceof HTMLElement).toEqual(true)

        const target = inputTarget as HTMLElement

        const attrKeys = toMatch.dataset['attr-keys']!.split(',')

        expect(toMatch.nodeType).toEqual(target.nodeType)

        attrKeys.forEach(attrName => {
            // @ts-ignore
            expect(target[attrName]).toEqual(toMatch[attrName])
        });

        // @ts-ignore
        [...toMatch.childNodes].forEach((child: Node, index) => {
            if(child instanceof HTMLElement) {
                partialMatch(target.childNodes[index] as HTMLElement, child as HTMLElement, context.concat([toMatch.nodeName]))
            } else {
                expect(child.valueOf()).toEqual(target.childNodes[index].valueOf())
            }
        })

    } catch( e: unknown|Error ) {

        if (e instanceof ThrowInfo) {
            throw new Error(`
    expected: ${JSON.stringify(e.expected, null, 4)}
    received: ${JSON.stringify(e.received, null, 4)}
    context: ${JSON.stringify(context, null, 4)}
`)

        } else {
            throw e
        }

    }


    return true

}

export function deepMatch(target: any, toMatch: any) {
    return JSON.stringify(target) === JSON.stringify(toMatch)
}