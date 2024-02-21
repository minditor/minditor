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

test.describe('RangeTool plugin', () => {

  test.only('Set range to para first text and last text, should show RangeTool plugin', async ({page}) => {
    await page.loadWithPlugin('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[0]!.value
    const lastText = data.children[0].content.at(-1)!.value
    const firstTextEl = await page.getByText(firstText).elementHandle()
    const lastTextEl = await page.getByText(lastText).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    await page.setSelection(firstTextEl, 1, lastTextEl, 1)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    await nextTick()


    // 1.2 出现 Plugin
    // 1.2 执行点击动作

    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    //
    // // 2.1 测试数据结构
    // const dataToCompare = structuredClone(data)
    // dataToCompare.children[0].content[3] = {
    //   type: 'InlineCode',
    //   value: 'js'
    // }
    // dataToCompare.children[0].content[4] = {
    //   type: 'Text',
    //   value: ''
    // }
    // expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
    //
    // // 2.2 测试 dom
    // await page.evaluate(([lastText, ZWSP]) => {
    //   const originPara = window.page.getByText(lastText as string).parentElement!
    //   const contentContainer = originPara.parentElement
    //   window.expectDOMMatch(contentContainer,
    //       <any>
    //         <p>
    //           <span>123</span>
    //           <span>456</span>
    //           <span>789</span>
    //           <any data-testignorechildren></any>
    //           <span>{ZWSP}</span>
    //         </p>
    //       </any>
    //   )
    // }, [lastText, ZWSP])
    //
    //
    // // 2.3 range 测试
    // await page.evaluate(([lastText]) => {
    //   const currentTextNode = window.page.getByText(lastText as string).nextSibling!.nextSibling!.firstChild!
    //   window.expectSelectionMatch({
    //     startContainer: currentTextNode,
    //     startOffset: 1, // CAUTION 应该转移到 ZWSP 后面。
    //     collapsed: true
    //   })
    // }, [lastText])
  })


  // TODO color picker

})