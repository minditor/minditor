import prettify from 'xml-formatter'

import { createElement as _createElement, type JSXElementType, type AttributesArg } from "../../src/DOM";

export function createElement(tag: JSXElementType, attrs: AttributesArg, ...children: HTMLElement[] ) {
    const attrKeys = attrs ? Object.keys(attrs) : []
    const extendedAttr = Object.assign({}, attrs, attrKeys.length ? {'data-testattrkeys': attrKeys.join(',')} : {})
    return _createElement(tag, extendedAttr, ...children)
}



class ThrowInfo {
    path?: string[]
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
export function expectDOMMatch(inputTarget: any, toMatch: HTMLElement, path: string[] = []): boolean {
    const currentPath = path.concat(toMatch.nodeName.toLowerCase())
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
                    expectDOMMatch(targetChild, child as HTMLElement, currentPath)
                } else if (targetChild instanceof Text && child instanceof Text){
                    expect(child.wholeText).toEqual(targetChild.wholeText)
                } else {
                    expect(child.valueOf()).toEqual(targetChild.valueOf())
                }
            })
        }

    } catch( e: unknown|Error ) {
        if (e instanceof ThrowInfo) {
            if (path.length !== 0) {
                if (!e.path) e.path = currentPath
                throw e
            } else {
                throw new Error(`
============================
path: ${(e.path ? e.path : currentPath).join(' > ')}
message: ${e.message}
expected: ${JSON.stringify(e.expected, null, 4)}
received: ${JSON.stringify(e.received, null, 4)}
expectedHTML:
${prettify(toMatch.outerHTML)}
receivedHTML:  
${inputTarget instanceof HTMLElement ? prettify(inputTarget.outerHTML) : JSON.stringify(inputTarget)}
============================
`)
            }


        } else {
            throw e
        }

    }


    return true

}

export function expectDeepMatch(target: any, toMatch: any) {
    return JSON.stringify(target) === JSON.stringify(toMatch)
}

type RangeLike = {
    startContainer: Node,
    startOffset: number,
    endContainer?: Node,
    endOffset?: number,
    collapsed?: boolean,
}
export function expectSelectionMatch(toMatch: RangeLike) {
    let range: Range
    try {
        const selection = window.getSelection()
        expect(selection!.rangeCount).toEqual(1)
        range = selection!.getRangeAt(0)!
        expect(range.startContainer).toEqual(toMatch.startContainer, 'startContainer not match')
        expect(range.startOffset).toEqual(toMatch.startOffset, "startOffset not match")
        if (toMatch.endContainer) {
            expect(range.endContainer).toEqual(toMatch.endContainer, 'endContainer not match')
        }
        if (toMatch.endOffset !== undefined) {
            expect(range.endOffset).toEqual(toMatch.endOffset, "endOffset not match")
        }
        if (toMatch.collapsed !== undefined) {
            expect(range.collapsed).toEqual(toMatch.collapsed)
        }
    } catch(e) {
        if (e instanceof ThrowInfo) {
            throw new Error(`
============================
message: ${e.message}
expected: {
    startContainer: ${(toMatch.startContainer as Text).wholeText},
    startOffset: ${toMatch.startOffset},
    endContainer: ${(toMatch.endContainer as Text).wholeText},
    endOffset: ${toMatch.endOffset},
}
received: {
    startContainer: ${(range!.startContainer as Text).wholeText},
    startOffset: ${range!.startOffset},
    endContainer: ${(range!.endContainer as Text).wholeText},
    endOffset: ${range!.endOffset},
}

============================
`)
        } else {
            throw e
        }
    }
}