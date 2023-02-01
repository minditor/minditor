import {expect, Locator, Page} from "@playwright/test";
import {ElementHandle} from "playwright-webkit";

const PORT = 5179

export function extend(page: Page) {
    page.load = async (dataName: string = 'singlePara') => {
        //@ts-ignore
        await page.goto(`http://localhost:${PORT}?data=${dataName}`);
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
            toJSON: () => page.evaluate(() => window.doc.root.toJSON())
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
    page.setSelection = async (startContainer: Locator, startOffset: number, endContainer: Locator = startContainer, endOffset: number = startOffset) =>  {
        // @ts-ignore
        return page.evaluate(([startContainer, startOffset, endContainer, endOffset]) => {
            window.actions.setSelection(startContainer, startOffset, endContainer, endOffset)
        }, [await startContainer.elementHandle(), startOffset, await endContainer.elementHandle(), endOffset])
    }

    // CAUTION 为什么不 extend 出 expectDOMMatch? 因为在  toMatch 中可能有需要在前端 cloneElement 的部分。
}

