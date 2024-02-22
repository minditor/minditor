/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from './data/singlePara'
import { data as emptyData } from './data/empty.js'
import { data as singleListData } from './data/singleList'
import { data as singleSectionData } from './data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
import { extend } from "./extend";

const ZWSP = '​'

test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  extend(page)
});

function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 1))
}

test.describe('markdown insert commands', () => {

  test('At Para head, use # to insert Heading', async ({page}) => {
    await page.loadWithPlugin('empty')
    const data = emptyData
    const focusTestId = 'test1'
    const firstTextEl = await page.getByTestId(focusTestId).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    await page.setSelection(firstTextEl, 1)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('#')
    await page.doc.element.press(' ')
    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    await nextTick()

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data) as any
    dataToCompare.children[0].type = 'Heading'
    dataToCompare.children[0].content[0].value = ''
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


    // 2.2 测试 dom
    await page.evaluate(([focusTestId, ZWSP]) => {
      const originPara = window.page.getByTestId(focusTestId as string).parentElement!
      const contentContainer = originPara.parentElement
      window.expectDOMMatch(contentContainer,
          <h1>
            <span>
              <span>{ZWSP}</span>
            </span>
          </h1>
      )
    }, [focusTestId, ZWSP])


    // 2.3 range 测试
    await page.evaluate(([focusTestId]) => {
      const currentTextNode = window.page.getByTestId(focusTestId as string).firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: 1, // CAUTION 应该转移到 ZWSP 后面。
        collapsed: true
      })
    }, [focusTestId])
  })

  test('At Para end, use ` to insert InlineCode', async ({page}) => {
    await page.loadWithPlugin('singlePara')
    const data = singleParaData
    const lastText = data.children[0].content.at(-1)!.value
    const firstTextEl = await page.getByText(lastText).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    await page.setSelection(firstTextEl, lastText.length)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('`')
    await page.doc.element.press('j')
    await page.doc.element.press('s')
    await page.doc.element.press('`')
    await page.doc.element.press(' ')
    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    await nextTick()

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data)
    dataToCompare.children[0].content[3] = {
      type: 'InlineCode',
      value: 'js'
    }
    dataToCompare.children[0].content[4] = {
      type: 'Text',
      value: ''
    }
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

    // 2.2 测试 dom
    await page.evaluate(([lastText, ZWSP]) => {
      const originPara = window.page.getByText(lastText as string).parentElement!
      const contentContainer = originPara.parentElement
      window.expectDOMMatch(contentContainer,
          <any>
            <p>
              <span>123</span>
              <span>456</span>
              <span>789</span>
              <any data-testignorechildren></any>
              <span>{ZWSP}</span>
            </p>
          </any>
      )
    }, [lastText, ZWSP])


    // 2.3 range 测试
    await page.evaluate(([lastText]) => {
      const currentTextNode = window.page.getByText(lastText as string).nextSibling!.nextSibling!.firstChild!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: 1, // CAUTION 应该转移到 ZWSP 后面。
        collapsed: true
      })
    }, [lastText])
  })

  test('At empty para end, use ``` to insert Code', async ({page}) => {
    await page.loadWithPlugin('empty')
    const data = emptyData
    const focusTestId = 'test1'
    const firstTextEl = await page.getByTestId(focusTestId).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    await page.setSelection(firstTextEl, 1)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('`')
    await page.doc.element.press('`')
    await page.doc.element.press('`')
    await page.doc.element.press('j')
    await page.doc.element.press('s')
    await page.doc.element.press(' ')
    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    await nextTick()

    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data) as any
    dataToCompare.children[0] = {
      type: 'Code'
    }
    dataToCompare.children[1] = {
      type: 'Paragraph',
      content: [{type: 'Text', value: ''}]
    }
    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

    // 2.2 测试 dom
    await page.evaluate(([ ZWSP]) => {
      const contentContainer = window.page.getByTestId('root').firstChild!.firstChild!
      window.expectDOMMatch(contentContainer,
          <any>
            <any data-testignorechildren></any>
            <p>
              <span>{ZWSP}</span>
            </p>
          </any>
      )
    }, [ ZWSP])


    // 2.3 range 测试
    const codeElClass = 'cm-activeLine'
    await page.evaluate(([codeElClass]) => {
      const currentTextNode = document.querySelector(`.${codeElClass as string}`)!
      window.expectSelectionMatch({
        startContainer: currentTextNode,
        startOffset: 0, // CAUTION 应该转移到 ZWSP 后面。
        collapsed: true
      })
    }, [codeElClass])
  })

  // TODO 有序列表
  // TODO 无序列表

})