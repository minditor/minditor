/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from './data/singlePara'
import { data as singleListData } from './data/singleList'
import { data as singleSectionData } from './data/singleSection'
import { data as multiSectionData } from './data/multiSection'
// import { data } from './data/component'
import { data as nestedListData } from './data/nestedList'
import { data as multiParaData } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
import {extend, stringifyNodeData} from "./extend";

const ZWSP = '​'

test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  extend(page)
});


test.describe('keyboard Backspace actions', () => {

  test.describe('at head of content', () => {
    test('Para content. Should combine two paras.', async ({page}) => {
      await page.load('multiPara')
      const data = multiParaData
      const focusText = data.children[1].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      dataToCompare.children[0].content.push(...dataToCompare.children[1].content)
      dataToCompare.children.splice(1, 1)
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {
        const originPara = window.page.getByText(focusText as string).parentElement!
        const contentContainer = originPara.parentElement


        const lastParaFirstText = (dataToCompare as any).children!.at(-1)!.content[0].value
        const afterPara = window.page.getByText(lastParaFirstText).parentElement!

        window.expectDOMMatch(contentContainer,
            <any>
              <p>{(dataToCompare as any).children[0].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {afterPara.cloneNode(true)}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(allText)
      }, [focusText, dataToCompare, allText])


      const originFirstParaLastText = data.children[0].content.at(-1)!.value
      // 2.3 range 测试
      await page.evaluate(([originFirstParaLastText]) => {
        const focusEl = window.page.getByText(originFirstParaLastText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: originFirstParaLastText.length,
          collapsed: true
        })
      }, [originFirstParaLastText])

    })


    test('Section content head. Should become paragraph.', async ({page}) => {
      await page.load('multiSection')
      const data = multiSectionData
      const focusText = data.children[1].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      dataToCompare.children[1].type= 'Paragraph'
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const originPara = window.page.getByText(focusText as string).parentElement!
        const contentContainer = originPara.parentElement!

        const parasElements = (dataToCompare as typeof multiSectionData).children.map(block => {
          return window.page.getByText(block.content[0].value).parentElement!
        })


        window.expectDOMMatch(contentContainer,
            <any>
              {parasElements[0].cloneNode(true)}
              <p>{(dataToCompare as any).children[1].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {parasElements[2].cloneNode(true)}
              {parasElements[3].cloneNode(true)}
              {parasElements[4].cloneNode(true)}
              {parasElements[5].cloneNode(true)}
              {parasElements[6].cloneNode(true)}
              {parasElements[7].cloneNode(true)}
              {parasElements[8].cloneNode(true)}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(allText)
      }, [focusText, dataToCompare, allText])

      // 新的 selection 仍让在这个节点头部
      // 2.3 range 测试
      await page.evaluate(([focusText]) => {
        const focusEl = window.page.getByText(focusText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [focusText])

    })


    test('ListItem content. Should change item into para.', async ({page}) => {
      await page.load('nestedList')
      const data = nestedListData
      const focusText = data.children![0].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText, {exact:true}).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data) as any
      dataToCompare.children![0] = { type: 'Paragraph', content: dataToCompare.children[0].content}
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
      //
      //
      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const contentContainer = window.page.getByText(focusText as string).parentElement!.parentElement!

        const restListItems = (dataToCompare as any).children.slice(1).map((itemData: any) => {
            return window.page.getByText(itemData.content[0].value, {exact:true}).parentElement!
        })

        window.expectDOMMatch(contentContainer,
            <any>
              <p>{(dataToCompare as any).children[0].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {restListItems.map((item:any) => item.cloneNode(true))}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(allText)
      }, [focusText, dataToCompare, allText])
      //
      // 新的 selection 会变成 para 的头部。
      // 2.3 range 测试
      await page.evaluate(([focusText]) => {
        const focusEl = window.page.getByText(focusText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [focusText])

    })

    test('ListItem content second level. should split into two list', async ({page}) => {
      await page.load('nestedList')
      const data = nestedListData
      const focusText = data.children![4].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText, {exact:true}).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data);
      // focus 的 content 变成 para，自己的 children 和后面的 item 变成新的 list。
      (dataToCompare.children as any[]).splice(4, 1, { type: 'Paragraph', content: dataToCompare.children[4].content});

      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
      // //
      // //
      // // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const paraContainer = window.page.getByText(focusText as string, {exact: true}).parentElement!
        const contentContainer = paraContainer.parentElement!

        window.expectDOMMatch(contentContainer,
            <any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <p>{(dataToCompare as any).children[4].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(allText)
      }, [focusText, dataToCompare, allText])
      // //
      // 新的 selection 会变成 para 的头部。
      // 2.3 range 测试
      await page.evaluate(([focusText]) => {
        const focusEl = window.page.getByText(focusText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [focusText])

    })
  })


})
