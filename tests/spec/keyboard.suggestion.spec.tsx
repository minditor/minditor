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
    return new Promise(resolve => setTimeout(resolve, 16))
}

test.describe('SuggestionTool plugin', () => {

  test('Set range to para first text and press /, should show SuggestionTool plugin', async ({page}) => {
    await page.loadWithPlugin('empty')
    const data = emptyData
    const focusTestId = 'test1'
    const firstTextEl = await page.getByTestId(focusTestId).elementHandle()

    // 1.1 设置焦点
    // CAUTION 注意这里的焦点要放在 ZWSP 后面
    await page.setSelection(firstTextEl, 1)
    await page.expect(() => window.getSelection()!.rangeCount === 1)

    // 1.2 执行动作
    await page.doc.element.press('/')
    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    await nextTick()


    // 1.2 出现 Plugin
    await page.expect(() => window.page.getByTestId('suggestionTool-container').style.display === 'block')
    // 1.2 执行点击动作
    await page.evaluate(() => {
        window.page.getByTestId('suggestionItem-Image').click()
    })

    // CAUTION plugin 都是在 nextTick 里面执行的，所以这里要等一下。
    //
    // 2.1 测试数据结构
    const dataToCompare = {
      children: [{
        type: 'Image',
      }, {
        type: 'Paragraph',
        content: [{
            type: 'Text',
            value: ''
        }]
      }]
    }

    expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
    //
    // // 2.2 测试 dom
    await page.evaluate(([ZWSP]) => {
      const contentContainer = window.page.getByTestId('root').firstChild!.firstChild!
      window.expectDOMMatch(contentContainer,
          <any>
            <any data-testignorechildren></any>
            <p>
              <span>{ZWSP}</span>
            </p>
          </any>
      )
    }, [ZWSP])
    //
    // // 2.3 range 测试
    await page.evaluate(() => {
      // TODO
    })
  })

  // TODO color picker

})