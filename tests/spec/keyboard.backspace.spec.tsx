/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from '../server/data/singlePara'
import { data as singleListData } from '../server/data/singleList'
import { data as singleSectionData } from '../server/data/singleSection'
import { data as multiSectionData } from '../server/data/multiSection'
// import { data } from './data/component'
import { data as nestedListData } from '../server/data/nestedList'
import { data as multiParaData } from '../server/data/multiPara'
// import { data } from './data/playgroundMultiPara'
import '../test-extend'
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
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


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


    test('Section content. Should insert into last block.', async ({page}) => {
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
      dataToCompare.children[0].content.push(...dataToCompare.children[1].content)
      const deletedSectionChildren: any[] = dataToCompare.children[1].children!
      dataToCompare.children.splice(1, 1, ...deletedSectionChildren)
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const originPara = window.page.getByText(focusText as string).parentElement!
        const contentContainer = originPara.parentElement!

        const para0 = window.page.getByText((dataToCompare as any).children!.at(0)!.content[0].value).parentElement!
        const para3 = window.page.getByText((dataToCompare as any).children!.at(3)!.content[0].value).parentElement!.parentElement!
        const para4 = window.page.getByText((dataToCompare as any).children!.at(4)!.content[0].value).parentElement!.parentElement!

        window.expectDOMMatch(contentContainer,
            <any>
              {para0.cloneNode(true)}
              <p>{(dataToCompare as any).children[1].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              <p>{(dataToCompare as any).children[2].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {para3.cloneNode(true)}
              {para4.cloneNode(true)}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(allText)
      }, [focusText, dataToCompare, allText])

      // 新的 selection 会探索到上一个节点的尾部
      const newFocusText = dataToCompare.children[0].content.at(-2)!.value
      // 2.3 range 测试
      await page.evaluate(([newFocusText]) => {
        const focusEl = window.page.getByText(newFocusText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: newFocusText.length,
          collapsed: true
        })
      }, [newFocusText])

    })


    test('ListItem content. Should change item into para.', async ({page}) => {
      await page.load('nestedList')
      const data = nestedListData
      const focusText = data.children[0].children[0].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      const deletedItem: any = dataToCompare.children[0].children[0];
      // content 变 para content
      (dataToCompare.children as any[]).unshift({type: 'Para', content: deletedItem.content})
      // children 提升
      dataToCompare.children[1].children.splice(0, 1, ...deletedItem.children);
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)
      //
      //
      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const paraContainer = window.page.getByText(focusText as string).parentElement!
        const contentContainer = paraContainer.parentElement!

        const listContainer = window.page.getByText((dataToCompare as any).children!.at(1)!.children[0].content[0].value).parentElement!.parentElement!.parentElement!

        window.expectDOMMatch(contentContainer,
            <any>
              <p>{(dataToCompare as any).children[0].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {listContainer.cloneNode(true)}
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
      const focusText = data.children[0].children[1].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      const deletedItem: any = dataToCompare.children[0].children[1];
      const restItems = dataToCompare.children[0].children.slice(2)
      dataToCompare.children[0].children.splice(1);
      // focus 的 content 变成 para，自己的 children 和后面的 item 变成新的 list。
      (dataToCompare.children as any[]).push({ type: 'Para', content: deletedItem.content});
      (dataToCompare.children as any[]).push({ type: 'List', children: deletedItem.children.concat(restItems)})

      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)
      // //
      // //
      // // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const paraContainer = window.page.getByText(focusText as string).parentElement!
        const contentContainer = paraContainer.parentElement!

        window.expectDOMMatch(contentContainer,
            <any>
              <any>
                <any data-testignorechildren></any>
              </any>
              <p>{(dataToCompare as any).children[1].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              <any>
                <any data-testignorechildren></any>
                <any data-testignorechildren></any>
              </any>
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
//
// describe('keyboard Enter actions', () => {
//
//   describe('at head of content', () => {

//
//
//
//
//   })
//
//
//
// })