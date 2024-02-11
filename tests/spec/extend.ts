import {expect, Page, ElementHandle} from "@playwright/test";

// FIXME 从 port 里面读取
const PORT = 5179

export function extend(page: Page) {
    if (page.load) return

    page.load = async (dataName: string = 'singlePara') => {
        //@ts-ignore
        await page.goto(`http://localhost:${PORT}/server/index.html?data=${dataName}`);
        await expect(page.getByTestId('root')).not.toBeEmpty()
    }


    page.expect = async (pageFn: (...arg:any[]) => any, args?:any, message?: string) => {
        return expect(await page.evaluate(pageFn, args), message).toBeTruthy()
    }

    page.expectAll = async (pageFn: (...arg:any[]) => any, args?:any, message?: string) => {
        return expect((await page.evaluate(pageFn, args)).every((item: any) => !!item), message).toBeTruthy()
    }

    page.doc = {
        root: {
            toJSON: () => page.evaluate(() => window.doc.content.toJSON())
        },
        get element() {
            return new Proxy({}, {
                get(target, method: keyof ElementHandle) {
                    return async function(...argv: any[]) {
                        // @ts-ignore
                        return (await page.evaluateHandle('window.doc.element')).asElement()![method](...argv)
                    }
                }
            }) as ElementHandle
        }
    }

    // TODO 再搞一个 selection 方便读写
    page.setSelection = async (startContainer: ElementHandle, startOffset: number, endContainer: ElementHandle = startContainer, endOffset: number = startOffset) =>  {
        // @ts-ignore
        return page.evaluate(([startContainer, startOffset, endContainer, endOffset]) => {
            // CAUTION 由于  locator 不能传递纯文本节点，所以只能这样
            window.actions.setSelection((startContainer as HTMLElement).firstChild, startOffset, (endContainer as HTMLElement).firstChild, endOffset)
        }, [startContainer, startOffset, endContainer, endOffset])
    }

    // CAUTION 为什么不 extend 出 expectDOMMatch? 因为在  toMatch 中可能有需要在前端 cloneElement 的部分。
}

export function stringifyNodeData(data: any) {
    if (data.type === 'Text') return data.value
    return `${data.content?.map((d: any) => stringifyNodeData(d)).join('') || ''}${data.children?.map((d: any) => stringifyNodeData(d)).join('') || ''}`
}