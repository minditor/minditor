import {expect} from "vitest";
// TODO attrs match  className  style dangerouslySetInnerHTML data
import prettify from "xml-formatter";



class ThrowInfo extends Error{
    path?: string[]
    constructor(
        readonly received: any,
        readonly expected: any,
        readonly userMessage: string,
    ) {
        super(`
message: ${userMessage}
expected: ${expected}
received: ${received}
`)
    }
}

export function assert(received: any, expected: any, message = '') {
        if (received !== expected) {
            throw new ThrowInfo(received, expected, message)
        }

        return true
}

export function expectDOMMatch(received: any, expected: HTMLElement, path: string[] = [], index? :number): boolean {
    const currentPath = path.concat(`${expected.nodeName.toLowerCase()}${index === undefined ? '' : `[${index}]`}`)
    try {
        assert(received instanceof HTMLElement, true, 'target is not HTMLElement')
        assert(expected instanceof HTMLElement, true, `toMatch is not HTMLElement`)

        const target = received as HTMLElement

        // testattrkeys 可能是个空字符串
        const attrKeys = expected.dataset['testattrkeys'] ? expected.dataset['testattrkeys'].split(',') : []

        if (expected.nodeName.toLowerCase() !== 'any') {
            assert(expected.nodeType, target.nodeType)
        }

        attrKeys.forEach(attrName => {
            // @ts-ignore
            assert(target[attrName], expected[attrName], `${attrName} not equal`)
        })


        if (!expected.dataset['testignorechildren']) {
            // expect(Array.from(target.childNodes).filter(child => !(child instanceof Comment)).length, expected.childNodes.length, 'children length not equal');

            let targetIndex = 0
            for(let index = 0; index < expected.childNodes.length; index++) {
                const child = expected.childNodes[index]
                if (child instanceof Comment) {
                    continue
                }

                let targetChild = target.childNodes[targetIndex]
                while(targetChild instanceof Comment) {
                    targetIndex++
                    targetChild = target.childNodes[targetIndex]
                }

                if(child instanceof HTMLElement) {
                    expectDOMMatch(targetChild, child as HTMLElement, currentPath, index)
                } else if (targetChild instanceof Text && child instanceof Text){
                    assert(child.wholeText, targetChild.wholeText)
                } else {
                    assert(child.valueOf(), targetChild.valueOf())
                }
                targetIndex++
            }
        }

    } catch( e: unknown|Error ) {
        if (e instanceof ThrowInfo) {
            // 只在最高层抛出 error，因为需要最高层的 expected 和 target 信息。
            if (path.length !== 0) {
                // 说明不是最高层。
                // 如果 !e.path 说明是当前出错的这层，这个 path 信息要记录
                if (!e.path) e.path = currentPath
                debugger
                throw e
            } else {
                throw new Error(`
============================
path: ${(e.path ? e.path : currentPath).join(' > ')}
message: ${e.message}
expected: ${JSON.stringify(e.expected, null, 4)}
received: ${JSON.stringify(e.received, null, 4)}
expectedHTML:
${prettify(expected.outerHTML)}
receivedHTML:  
${received instanceof HTMLElement ? prettify(received.outerHTML) : JSON.stringify(received)}
============================
`)
            }
        } else if ( e instanceof Error){
            throw e
        } else {
            throw new Error(`
unknown throw:
path: ${currentPath.join(' > ')},
object: ${JSON.stringify(e)}
`)
        }

    }


    return true
}

expect.extend({
    toMatchDOM(received, expected) {
        try {
            expectDOMMatch(received, expected)
        } catch(e) {
            return {
                pass: false,
                message: () => (e as Error).message
            }
        }
        return {
            pass: true,
            message: () => 'pass'
        }
    }
})
