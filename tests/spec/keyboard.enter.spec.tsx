/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from './data/singlePara'
import { data as singleListData } from './data/singleList'
import { data as singleSectionData } from './data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
import { extend } from './extend'

const ZWSP = '​'

test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  extend(page)
});


test.describe('keyboard Enter actions', () => {

  test.describe('at head of content', () => {

    test('Para content. Should create new Para before this.', async ({page}) => {
      await page.load('singlePara')
      const data = singleParaData
      const firstText = data.children[0].content[0].value
      const allText = data.children[0].content.map(i => i.value).join('')

      const firstTextEl = await page.getByText(firstText).elementHandle()

      // 1.1 设置焦点
      await page.setSelection(firstTextEl, 0)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      dataToCompare.children.unshift({ type:'Paragraph', content: [{type: 'Text', value: ''}]})
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, allText, ZWSP]) => {
        const originPara = (firstTextEl as Node).parentElement!
        const contentContainer = originPara.parentElement

        window.expectDOMMatch(contentContainer,
            <any>
              <p><span>{ZWSP}</span></p>
              {originPara.cloneNode(true)}
            </any>),
        window.expect(window.doc.element!.textContent).toEqual(`${ZWSP}${allText}`)
      }, [firstTextEl, allText, ZWSP])


      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: firstTextEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [firstTextEl])

    })


    test('Section content. Should create new Para before this.', async ({page}) => {
      await page.load('singleSection')
      const data = singleSectionData
      const firstText = data.children[0].content[0].value
      const firstTextEl = await page.getByText(firstText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(firstTextEl, 0)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children.unshift({ type:'Paragraph', content: [{type: 'Text', value: ''}]})
      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const focusPElement = (firstTextEl as Node)!.parentElement!
        const newPElement = focusPElement!.previousSibling!

          window.expectDOMMatch(newPElement, <p><span>{ZWSP}</span></p>)
          // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
          window.expect(window.doc.element!.textContent).toEqual(`${ZWSP}12322`, 'whole text not match')

      }, [firstTextEl, ZWSP])

      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: firstTextEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [firstTextEl])
    })


    test('List content. Should create new List item before this.', async ({page}) => {
      await page.load('singleList')
      const data = singleListData
      const firstText = data.children[0].content[0].value
      const firstTextEl = await  page.getByText(firstText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(firstTextEl, 0)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children.unshift({ type:'ULItem', content: [{type: 'Text', value: ''}]})
      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const listElement = (firstTextEl as Node).parentElement!.parentElement!
        window.expectDOMMatch(listElement,
            <any>
              <any>
                <span>{ZWSP}</span>
              </any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
            </any>
        ),
        // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
        window.expect(window.doc.element!.textContent).toEqual(`${ZWSP}123456789`)
      }, [firstTextEl, ZWSP])

      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: firstTextEl!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [firstTextEl])

    })

  })


  test.describe('at end of content', () => {

    test('Para content end. Should create new Para after this.', async ({page}) => {
      await page.load('singlePara')
      const data = singleParaData
      const focusText = data.children!.at(-1)!.content!.at(-1)!.value
      const allText = data.children[0].content.map(i => i.value).join('')

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点在段落结尾
      await page.setSelection(focusTextEl, focusText.length)
      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      dataToCompare.children.push({type: 'Paragraph', content: [{type: 'Text', value: ''}]})
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, allText, ZWSP]) => {
        const originPara = (firstTextEl as Node).parentElement!
        const contentContainer = originPara.parentElement
        window.expectDOMMatch(contentContainer,
            <any>
              {originPara.cloneNode(true)}
              <p><span>{ZWSP}</span></p>
            </any>),
        window.expect(window.doc.element!.textContent).toEqual(`${allText}${ZWSP}`)
      }, [focusTextEl, allText, ZWSP])


      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: firstTextEl!.parentElement!.nextSibling!.firstChild!.firstChild,
          // CAUTION 因为是空的，会渲染出一个 ZWSP，并且 cursor 在 1 的位置
          startOffset: 1,
          collapsed: true
        })
      }, [focusTextEl])

    })


    test('Section content. Should create new Para after head of children.', async ({page}) => {
      await page.load('singleSection')
      const data = singleSectionData
      const focusText = data.children[0].content!.at(-1)!.value

      const focusTextEl = await page.getByText(focusText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(focusTextEl, focusText.length)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children.splice(1, 0, { type:'Paragraph', content: [{type: 'Text', value: ''}]})
      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const titleElement = (firstTextEl as Node)!.parentElement!
        const sectionElement = titleElement.parentElement!
        window.expectDOMMatch(sectionElement,
            <any>
              {titleElement.cloneNode(true)}
              <p><span>{ZWSP}</span></p>
              <any data-testignorechildren></any>
            </any>

        )
          // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
        window.expect(window.doc.element!.textContent).toEqual(`123${ZWSP}22`, 'whole text not match')
      }, [focusTextEl, ZWSP])

      // 2.3 range 测试
      const firstParaText = data.children[1].content[0]!.value
      await page.evaluate(([firstParaText]) => {
        const firstParaElement = window.page.getByText(firstParaText)
        window.expectSelectionMatch({
          startContainer: (firstParaElement as Node)!.parentElement!.previousSibling!.firstChild!.firstChild,
          startOffset: 1,
          collapsed: true
        })
      }, [firstParaText])
    })

    test('List content. Should create new List item after this.', async ({page}) => {
      await page.load('singleList')
      const data = singleListData
      const firstText = data.children[0].content[0].value
      const firstTextEl = await page.getByText(firstText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(firstTextEl, firstText.length)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children.splice(1, 0, { type:'ULItem', content: [{type: 'Text', value: ''}]})
      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const listElement = (firstTextEl as Node).parentElement!.parentElement!
        window.expectDOMMatch(listElement,
            <any>
              <any data-testignorechildren></any>
              <any>
                <span>{ZWSP}</span>
              </any>
              <any data-testignorechildren></any>
              <any data-testignorechildren></any>
            </any>
        ),
            // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
            window.expect(window.doc.element!.textContent).toEqual(`123${ZWSP}456789`)
      }, [firstTextEl, ZWSP])

      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: (firstTextEl as Node)!.parentElement!.nextSibling!.firstChild!.firstChild!,
          // 空字符的会定位到 Offset 1
          startOffset: 1,
          collapsed: true
        })
      }, [firstTextEl])

    })
  })


  test.describe('at middle of content', () => {

    test('Para content. Should split into to para.', async ({page}) => {
      await page.load('singlePara')
      const data = singleParaData
      const focusText = data.children[0].content[1]!.value
      const allText = data.children[0].content.map(i => i.value).join('')

      const focusTextEl = await page.getByText(focusText).elementHandle()

      // 1.1 设置焦点在段落的 文字中间。
      await page.setSelection(focusTextEl, 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      const firstParaPart = structuredClone(dataToCompare.children[0])
      firstParaPart.content.pop()
      firstParaPart.content[1].value = firstParaPart.content[1].value.slice(0, 1)


      dataToCompare.children[0].content.shift()
      dataToCompare.children[0].content[0].value = dataToCompare.children[0].content[0].value.slice(1)

      dataToCompare.children.unshift(firstParaPart)
      // FIXME
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)


      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, allText]) => {
        const originPara = (firstTextEl as Node).parentElement!
        const contentContainer = originPara.parentElement
        window.expectDOMMatch(contentContainer,
            <any>
              <p>
                <span>123</span>
                <span>4</span>
              </p>
              <p>
                <span>56</span>
                <span>789</span>
              </p>
            </any>),
            window.expect(window.doc.element!.textContent).toEqual(`${allText}`)
      }, [focusTextEl, allText])


      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {
        window.expectSelectionMatch({
          startContainer: window.page.getByText('56')!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [focusTextEl])

    })

    test('Section title middle. Should create new paragraph using split text.', async ({page}) => {
      await page.load('singleSection')
      const data = singleSectionData
      const focusText = data.children[0].content[0].value

      const focusTextEl = await page.getByText(focusText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(focusTextEl, 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children[0].content[0].value = '1'
      dataToCompare.children.splice(1, 0, { type:'Paragraph', content: [{type: 'Text', value: '23'}]})

      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const sectionsElement = (firstTextEl as Node)!.parentElement!.parentElement!
        window.expectDOMMatch(sectionsElement,
            <any>
              <any>
                <span>1</span>
              </any>
              <p>
                <span>23</span>
              </p>
              <any data-testignorechildren/>
            </any>
        )
        // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
        window.expect(window.doc.element!.textContent).toEqual(`12322`, 'whole text not match')
      }, [focusTextEl, ZWSP])

      // 2.3 range 测试
      const firstParaText = dataToCompare.children[1].content[0]!.value
      await page.evaluate(([firstParaText]) => {
        const firstParaElement = window.page.getByText(firstParaText)
        window.expectSelectionMatch({
          startContainer: firstParaElement!.firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [firstParaText])
    })

    test('List content. Should create new List item in middle.', async ({page}) => {
      await page.load('singleList')
      const data = singleListData
      const firstText = data.children[1].content[0].value
      const firstTextEl = await page.getByText(firstText).elementHandle()
      // 1.1 设置焦点
      await page.setSelection(firstTextEl, 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // @ts-ignore
      dataToCompare.children.splice(1, 0, { type:'ULItem', content: [{type: 'Text', value: '4'}]})
      dataToCompare.children[2].content[0].value = '56'
      await expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare.children)

      // 2.2 测试 dom
      await page.evaluate(([firstTextEl, ZWSP]) => {
        const listElement = (firstTextEl as Node).parentElement!.parentElement!
        window.expectDOMMatch(listElement,
            <any>
              <any data-testignorechildren></any>
              <any>
                <span>4</span>
              </any>
              <any>
                <span>56</span>
              </any>
              <any data-testignorechildren></any>
            </any>
        ),
            // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
            window.expect(window.doc.element!.textContent).toEqual(`123456789`)
      }, [firstTextEl, ZWSP])

      // 2.3 range 测试
      await page.evaluate(([firstTextEl]) => {

        window.expectSelectionMatch({
          startContainer: window.page.getByText('56').firstChild,
          startOffset: 0,
          collapsed: true
        })
      }, [firstTextEl])

    })

  })

})