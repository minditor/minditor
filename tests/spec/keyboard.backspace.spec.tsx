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
import { data as inlineComponentData } from './data/inlineComponent'
import { data as miscData } from './data/misc'
// import { data } from './data/playgroundMultiPara'
import {extend, stringifyNodeData} from "./extend";

const ZWSP = '​'

test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  extend(page)
});


test.describe('keyboard Backspace actions', () => {

  test.describe('at head of content', () => {
    test('Para content head. Should combine two paras.', async ({page}) => {
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

    test('Empty Para head with List as prev. Should delete empty para.', async ({page}) => {
      await page.load('misc')
      const data = miscData
      const allText = stringifyNodeData(data)
      const focusTestId = 'emptyParaHead'

      const focusTextEl = await page.getByTestId(focusTestId).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      dataToCompare.children.pop()
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      const lastText = dataToCompare.children.at(-1)!.content.at(-1)!.value
      // 2.2 测试 dom
      await page.evaluate(([lastText, dataToCompare, allText]) => {
        const originPara = window.page.getByText(lastText as string, {exact:true}).parentElement!
        const contentContainer = originPara.parentElement!.parentElement

        window.expectDOMMatch(contentContainer,
            <any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
            </any>
        )
      }, [lastText, dataToCompare, allText])


      const originFirstParaLastText = data.children[0].content.at(-1)!.value
      // 2.3 range 测试
      await page.evaluate(([lastText]) => {
        const focusEl = window.page.getByText(lastText, {exact:true})
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: lastText.length,
          collapsed: true
        })
      }, [lastText])
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
      await page.expect(([focusText]: [string]) => {
        return window.getSelection()!.getRangeAt(0)!.startContainer!.nodeValue === focusText
      }, [focusText])


      // CAUTION 一定要定位到 heading 的 contenteditable 的位置输入，不然在 chromium/webkit 里面会自动跳到最外面的 contenteditable。
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
              {parasElements[4].parentElement!.parentElement!.cloneNode(true)}
              {parasElements[5].parentElement!.parentElement!.cloneNode(true)}
              {parasElements[6].cloneNode(true)}
              {parasElements[7].parentElement!.parentElement!.cloneNode(true)}
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
            return window.page.getByText(itemData.content[0].value, {exact:true}).parentElement!.parentElement
        })

        window.expectDOMMatch(contentContainer,
            <any>
              <p>{(dataToCompare as any).children[0].content.map(({value}: {value: string}) => <span>{value}</span>)}</p>
              {restListItems.map((item:any) => item.cloneNode(true))}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual('focusText2222222◦3333333333333▪4444444444444▪555555555555•666666666666◦777777777777•focusSecondText888888◦808088080888080888•999999999999')
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

    test('ListItem content second level head. Should unwrap into level 1.', async ({page}) => {
      await page.load('nestedList')
      const data = nestedListData
      const focusText = data.children![1].content[0].value
      const allText = stringifyNodeData(data)

      const focusTextEl = await page.getByText(focusText, {exact:true}).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data) as any
      dataToCompare.children![1].level -= 1
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)
      //
      //
      // 2.2 测试 dom
      await page.evaluate(([focusText, dataToCompare, allText]) => {

        const contentContainer = window.page.getByText(focusText as string).parentElement!.parentElement!.parentElement!

        const listItems = (dataToCompare as any).children.map((itemData: any) => {
          return window.page.getByText(itemData.content[0].value, {exact:true}).parentElement!.parentElement
        })

        window.expectDOMMatch(contentContainer,
            <any>
              {listItems[0].cloneNode(true)}
              <any>
                <any>•</any>
                <any data-testignorechildren></any>
              </any>
              {listItems.slice(2).map((item:any) => item.cloneNode(true))}
            </any>),
            window.expect(window.doc.element!.textContent).toEqual('•focusText2222222•3333333333333▪4444444444444▪555555555555•666666666666◦777777777777•focusSecondText888888◦808088080888080888•999999999999')
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

    test('ListItem content second part. should split into two list', async ({page}) => {
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
            window.expect(window.doc.element!.textContent).toEqual('•focusText2222222◦3333333333333▪4444444444444▪555555555555666666666666◦777777777777•focusSecondText888888◦808088080888080888•999999999999')
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


  test.describe('after InlineComponent', () => {
    test('should delete the component', async ({page}) => {
      await page.load('inlineComponent')
      const data = inlineComponentData
      const focusText = data.children[0].content[2].value

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Backspace')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data);
      dataToCompare.children[0].content.splice(1, 1)
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([focusText]) => {
        const contentContainer = window.page.getByText(focusText as string).parentElement!
        window.expectDOMMatch(contentContainer,
          <any>
            <span>a</span>
            <span>c</span>
          </any>
        )
      }, [focusText])

      const newFocusText = data.children[0].content[0].value

      // 新的 selection 应该变成了第一个 Text 的尾部
      // // 2.3 range 测试
      await page.evaluate(([newFocusText]) => {
        const focusEl = window.page.getByText(newFocusText)
        window.expectSelectionMatch({
          startContainer: focusEl!.firstChild,
          startOffset: 1,
          collapsed: true
        })
      }, [newFocusText])

    })
  })

})
