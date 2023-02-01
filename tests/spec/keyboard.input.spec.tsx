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

    const firstTextEl = await page.getByText(firstText).elementHandle()

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
    await page.evaluate(([firstTextEl]) => {
      const originPara = (firstTextEl as Node).parentElement!
      const contentContainer = originPara.parentElement
      window.expectDOMMatch(contentContainer,
          <any>
            <p>
              <span>123a</span>
              <span>456</span>
              <span>789</span>
            </p>
          </any>
      )
    }, [firstTextEl])


    // 2.3 range 测试
    await page.evaluate(([firstTextEl]) => {
      const currentTextNode = firstTextEl!.previousSibling!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: currentTextNode.nodeValue!.length, // CAUTION 应该转移到了上一个节点末尾。
        collapsed: true
      })
    }, [firstTextEl])

  })

  test('At pare head. Should add char to head', async ({page}) => {
    await page.load('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[0].value // CAUTION <- 注意这里

    const firstTextEl = await page.getByText(firstText).elementHandle()

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
    await page.evaluate(([firstTextEl]) => {
      const originPara = (firstTextEl as Node)!.parentElement!
      const contentContainer = originPara.parentElement

      window.expectDOMMatch(contentContainer,
          <any>
            <p>
              <span>a123</span>
              <span>456</span>
              <span>789</span>
            </p>
          </any>
      )
    }, [firstTextEl])


    // 2.3 range 测试
    await page.evaluate(([firstTextEl]) => {
      const currentTextNode = firstTextEl!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: 1,
        collapsed: true
      })
    }, [firstTextEl])

  })


  test('At text middle', async ({page}) => {
    await page.load('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[0].value // CAUTION <- 注意这里

    const firstTextEl = await page.getByText(firstText).elementHandle()

    // 1.1 设置焦点
    const startOffset = 1
    await page.setSelection(firstTextEl, startOffset)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('a')

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data)
    // TODO 还要对比和 API 创造出来的是否一样？
    const originValue = dataToCompare.children[0].content[0].value
    dataToCompare.children[0].content[0].value = originValue[0] + 'a' + originValue.slice(1)
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


    // 2.2 测试 dom
    await page.evaluate(([firstTextEl]) => {
      const originPara = (firstTextEl as Node).parentElement!
      const contentContainer = originPara.parentElement
      window.expectDOMMatch(contentContainer,
          <any>
            <p>
              <span>1a23</span>
              <span>456</span>
              <span>789</span>
            </p>
          </any>
      )
    }, [firstTextEl])


    // 2.3 range 测试
    await page.evaluate(([firstTextEl, startOffset]) => {
      const currentTextNode = (firstTextEl as Node)!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: startOffset as number + 1,
        collapsed: true
      })
    }, [firstTextEl, startOffset])

  })


})