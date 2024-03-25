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

  test('Set range to para first text and last text, should show RangeTool plugin', async ({page}) => {
    await page.loadWithPlugin('singlePara')
    const data = singleParaData
    const firstText = data.children[0].content[0]!.value
    const lastText = data.children[0].content.at(-1)!.value
    const firstTextEl = await page.getByText(firstText).elementHandle()
    const lastTextEl = await page.getByText(lastText).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    const startOffset = 1
    const endOffset = 1
    await page.setSelection(firstTextEl, startOffset, lastTextEl, endOffset)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    await nextTick()
    const lastTextElRect = await lastTextEl!.evaluate(el => el.getBoundingClientRect())
    await lastTextEl?.dispatchEvent('mouseup', { button: 'left', clientX: lastTextElRect.right, clientY: lastTextElRect.bottom})
    await nextTick()

    // 1.2 出现 Plugin
    await page.expect(() => window.page.getByTestId('rangeTool-container').style.display === 'block')
    // 1.2 执行点击动作
    await page.evaluate(() => {
        window.page.getByTestId('format-bold').click()
    })

    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    //
    // 2.1 测试数据结构
    const dataToCompare = structuredClone(data) as any
    const firstTextLeft = dataToCompare.children[0].content[0].value.slice(0, startOffset)
    const lastTextLeft = dataToCompare.children[0].content.at(-1)!.value.slice( endOffset)

    dataToCompare.children[0].content[0].value = dataToCompare.children[0].content[0].value.slice(startOffset)
    dataToCompare.children[0].content.at(-1)!.value = dataToCompare.children[0].content.at(-1)!.value.slice(0, endOffset)

    dataToCompare.children[0].content.unshift({
        type: 'Text',
        value: firstTextLeft
    })

    dataToCompare.children[0].content.push({
      type: 'Text',
      value: lastTextLeft
    })

    dataToCompare.children[0].content.slice(1, -1).forEach((text: any) => {
      text.formats = {bold: true}
    })

    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
    //
    // // 2.2 测试 dom
    await page.evaluate(() => {
      const contentContainer = window.page.getByTestId('docContent')!.firstChild!
      window.expectDOMMatch(contentContainer,
          <any>
            <p>
              <span>1</span>
              <span>23</span>
              <span>456</span>
              <span>7</span>
              <span>89</span>
            </p>
          </any>
      )
    })
    //
    // // 2.3 range 测试
    await page.evaluate(([startText, endText]) => {
      const currentTextNode = window.page.getByText(startText as string)
      const lastTextNode =window.page.getByText(endText as string)
      window.expectSelectionMatch({
        startContainer: currentTextNode.firstChild!,
        startOffset: 0,
        endContainer: lastTextNode.firstChild!,
        endOffset: lastTextNode.textContent!.length
      })
    }, [dataToCompare.children[0].content[1].value, dataToCompare.children[0].content.at(-2).value, ])
  })

  // TODO color picker

})