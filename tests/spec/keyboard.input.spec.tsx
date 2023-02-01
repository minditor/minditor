/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from '../server/data/singlePara'
import { data as singleListData } from '../server/data/singleList'
import { data as singleSectionData } from '../server/data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
import '../test-extend'
import { extend } from "./extend";

const ZWSP = '​'

test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  extend(page)
});


test.describe('keyboard Input actions', () => {

  test('At text head but not pare head. Should add char to previous text node', async ({page}) => {
    await page.load('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[1].value // CAUTION <- 注意这里
    const allText = data.children[0].content.map(i => i.value).join('')

    const firstTextEl = page.getByText(firstText)

    // 1.1 设置焦点
    await page.setSelection(firstTextEl, 0)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('a')

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data)
    // TODO 还要对比和 API 创造出来的是否一样？
    dataToCompare.children[0].content[0].value = dataToCompare.children[0].content[0].value + 'a'
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


    // 2.2 测试 dom
    await page.expectAll(([firstTextEl, allText, ZWSP]: [t: HTMLElement, a: string, c: string]) => {
      const originPara = firstTextEl.parentElement!
      const contentContainer = originPara.parentElement
      return [
        window.expectDOMMatch(contentContainer,
            <any>
              <p>
                <span>123a</span>
                <span>456</span>
                <span>789</span>
              </p>
            </any>),
      ]
    }, [await firstTextEl.elementHandle(), allText, ZWSP], 'match dom')


    // 2.3 range 测试
    await page.evaluate(([firstTextEl]) => {
      const currentTextNode = firstTextEl!.previousSibling!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: currentTextNode.nodeValue!.length, // CAUTION 应该转移到了上一个节点末尾。
        collapsed: true
      })
    }, [await firstTextEl.elementHandle()])

  })

  test('At pare head. Should add char to head', async ({page}) => {
    await page.load('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[0].value // CAUTION <- 注意这里
    const allText = data.children[0].content.map(i => i.value).join('')

    const firstTextEl = page.getByText(firstText)

    // 1.1 设置焦点
    await page.setSelection(firstTextEl, 0)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('a')

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data)
    // TODO 还要对比和 API 创造出来的是否一样？
    dataToCompare.children[0].content[0].value = 'a' + dataToCompare.children[0].content[0].value
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


    // 2.2 测试 dom
    await page.expectAll(([firstTextEl, allText, ZWSP]: [t: HTMLElement, a: string, c: string]) => {
      const originPara = firstTextEl.parentElement!
      const contentContainer = originPara.parentElement
      return [
        window.expectDOMMatch(contentContainer,
            <any>
              <p>
                <span>a123</span>
                <span>456</span>
                <span>789</span>
              </p>
            </any>),
      ]
    }, [await firstTextEl.elementHandle(), allText, ZWSP], 'match dom')


    // 2.3 range 测试
    await page.evaluate(([firstTextEl]) => {
      const currentTextNode = firstTextEl!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: 1,
        collapsed: true
      })
    }, [await firstTextEl.elementHandle()])

  })


})