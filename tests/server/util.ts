import { createElement as _createElement, type JSXElementType, type AttributesArg } from "../../src/DOM";

export function createElement(tag: JSXElementType, attrs: AttributesArg, ...children: HTMLElement[] ) {
    const attrKeys = attrs ? Object.keys(attrs) : []
    const extendedAttr = Object.assign({}, attrs, attrKeys.length ? {'data-testattrkeys': attrKeys.join(',')} : {})
    return _createElement(tag, extendedAttr, ...children)
}



class ThrowInfo {
    constructor(
        readonly received: any,
        readonly expected: any,
        readonly message?: string,
    ) {
    }
}

export function expect(received: any) {
    return {
        toEqual(expected: any, message?:string) {
            if (received !== expected) {
                debugger
                throw new ThrowInfo(received, expected, message)
            }

            return true
        }
    }
}



// TODO attrs match 还有 className  style dangerouslySetInnerHTML data 等特殊情况
export function partialMatch(inputTarget: any, toMatch: HTMLElement, context: string[] = []): boolean {
    try {
        console.log(inputTarget, toMatch)
        expect(inputTarget instanceof HTMLElement).toEqual(true, 'target is not HTMLElement')
        expect(toMatch instanceof HTMLElement).toEqual(true, `toMatch is not HTMLElement`)

        const target = inputTarget as HTMLElement

        // testattrkeys 可能是个空字符串
        const attrKeys = toMatch.dataset['testattrkeys'] ? toMatch.dataset['testattrkeys'].split(',') : []

        if (toMatch.nodeName.toLowerCase() !== 'any') {
            expect(toMatch.nodeType).toEqual(target.nodeType)
        }

        attrKeys.forEach(attrName => {
            // @ts-ignore
            expect(target[attrName]).toEqual(toMatch[attrName], `${attrName} not equal`)
        })

        if (!toMatch.dataset['testignorechildren']) {
            expect(target.childNodes.length).toEqual(toMatch.childNodes.length, 'children length not equal');

            // @ts-ignore
            [...toMatch.childNodes].forEach((child: Node, index) => {
                const targetChild = target.childNodes[index]
                if(child instanceof HTMLElement) {
                    partialMatch(targetChild, child as HTMLElement, context.concat([toMatch.nodeName]))
                } else if (targetChild instanceof Text && child instanceof Text){
                    expect(child.wholeText).toEqual(targetChild.wholeText)
                } else {
                    expect(child.valueOf()).toEqual(targetChild.valueOf())
                }
            })
        }

    } catch( e: unknown|Error ) {

        if (e instanceof ThrowInfo) {
            throw new Error(`
    expected: ${JSON.stringify(e.expected, null, 4)}
    received: ${JSON.stringify(e.received, null, 4)}
    message: ${e.message}
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