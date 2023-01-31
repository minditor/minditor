/**@jsx createElement*/
import {createElement} from './mock'
import { test, expect } from '@playwright/test';
import { data as singleSectionData } from '../server/data/singleSection'
// import { data } from './data/multiSection'
import { data as singleParaData } from '../server/data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
import '../test-extend'
import {ElementHandle} from "playwright-webkit";

const PORT = 5179
const ZWSP = '​'



function $(elementHandle: ElementHandle) {
    return {
      async parentElement() {
        return (await elementHandle.evaluateHandle((el: HTMLElement) => el.parentElement)).asElement()
      }
    }
}



test.beforeEach(async ({ page }) => {
  // TODO 变成 global setup
  page.load = async (dataName: string = 'singlePara') => {
    //@ts-ignore
    await page.goto(`http://localhost:${PORT}?data=${dataName}`);
    await expect(page.getByTestId('root')).not.toBeEmpty()
  }


  page.expect = async (pageFn: (...arg:any[]) => any, args?:any, message?: string) => {
    return expect(await page.evaluate(pageFn, args), message).toBeTruthy()
  }

  page.expectAll = async (pageFn: (...arg:any[]) => any, args?:any, message?: string) => {
    return expect((await page.evaluate(pageFn, args)).every((item: any) => !!item), message).toBeTruthy()
  }

  page.doc = {
    root: {
      toJSON: () => page.evaluate(() => window.doc.root.toJSON())
    },
    get element() {
      return new Proxy({}, {
        get(target, method: keyof ElementHandle) {
          return async function(...argv: any[]) {
            // @ts-ignore
            return (await page.evaluateHandle('window.doc.element')).asElement()![method](...argv)
          }
        }
      }) as ElementHandle
    }
  }

  // TODO 再搞一个 selection 方便读写

});


test.describe('keyboard Enter actions', () => {

  test.describe('at head of content', () => {

    test.only('Para content. Should create new Para before this.', async ({page}) => {
      await page.load('singlePara')
      const data = singleParaData
      const firstText = data.children[0].content[0].value
      const allText = data.children[0].content.map(i => i.value).join('')

      const firstTextEl = page.getByText(firstText)

      // 1.1 设置焦点
      await firstTextEl.evaluate((firstTextEl) => {
        window.actions.setSelection(firstTextEl, 0)
      })

      await page.expect(() => window.getSelection()!.rangeCount === 1)

      // 1.2 执行动作
      await page.doc.element.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      dataToCompare.children.unshift({ type:'Para', content: [{type: 'Text', value: ''}]})
      expect(await page.doc.root.toJSON()).toMatchObject(dataToCompare)


      // 2.2 测试 dom
      await page.expectAll(([firstText, allText, ZWSP]: [t: string, a: string, c: string]) => {
        const originPara = window.page.getByText(firstText).parentElement!
        const contentContainer = originPara.parentElement
        return [
          window.partialMatch(contentContainer,
              <any>
                <p><span>{ZWSP}</span></p>
                {originPara.cloneNode(true)}
              </any>),
          window.expect(window.doc.element!.textContent).toEqual(`${ZWSP}${allText}`)
        ]
      }, [firstText, allText, ZWSP], 'match dom')

      // const contentContainer = (await firstTextEl.evaluateHandle((el: HTMLElement) => el.parentElement)).asElement()
      // const originPara = $(firstTextEl).parentElement()
      // const contentContainer = $(originPara).parentElement()
      // await expect(contentContainer).partialMatch(<any>
      //   //           <p><span>{ZWSP}</span></p>
      //   //           {originPara.cloneNode(true)}
      //   //         </any>)

      // 2.3 range 测试
      await page.expectAll(([firstText, allText]: [t: string, a: string]) => {
        const range = window.state.selectionRange
        const currentElement = window.page.getByText(firstText)
        return [
          range!.startContainer === currentElement.firstChild,
          range!.startOffset === 0,
          range!.collapsed
        ]
      }, [firstText, allText])

    })


    test('Section content. Should create new Para before this.', async ({page}) => {
      await page.load('singleSection')
      const data = singleSectionData
      const firstText = data.children[0].content[0].value
      const allText = data.children[0].content.map(i => i.value).join('')
      // 1.1 设置焦点
      await page.evaluate((firstText: string) => {
        window.actions.setSelection(window.page.getByText(firstText), 0)
      }, firstText)

      // 1.2 执行动作
      const rootHandle = page.getByTestId('app')
      await rootHandle.press('Enter')

      // 2.1 测试数据结构
      const dataToCompare = structuredClone(data)
      // TODO 还要对比和 API 创造出来的是否一样？
      // @ts-ignore
      dataToCompare.children.unshift({ type:'Para', content: [{type: 'Text', value: ''}]})
      await expect(await page.evaluate(() => window.doc.root.toJSON())).toMatchObject(dataToCompare)

      // 2.2 测试 dom
      await page.expectAll(([firstText, data, ZWSP]: [t: string, a: any, c: string]) => {
        const focusPElement = window.page.getByText(firstText).parentElement!.parentElement
        const newPElement = focusPElement!.previousSibling!
        return [
          window.partialMatch(newPElement, <p><span>{ZWSP}</span></p>),
          // window.expect(window.doc.element!.textContent).toEqual(`${data.content[0].join('')}${ZWSP}${allText}`)
          window.expect(window.doc.element!.textContent).toEqual(`00${ZWSP}1122`)
        ]
      }, [firstText, data, ZWSP], 'match dom')

      // 2.3 range 测试
      await page.expectAll(([firstText]: [t: string, a: string]) => {
        const range = window.state.selectionRange
        const currentElement = window.page.getByText(firstText)
        return [
          range!.startContainer === currentElement.firstChild,
          range!.startOffset === 0,
          range!.collapsed
        ]
      }, [firstText])

    })

    //
    // test('Listitem content', async () => {
    //   const user = userEvent.setup({ document })
    //   const { result: doc } = buildModelFromData({
    //     type: 'Doc',
    //     content: [{ type: 'Text', value: '00'} ],
    //     children: [{
    //       type: 'List',
    //       children: [{
    //         type: 'ListItem',
    //         content: [{ type: 'Text', value: '11'} ]
    //       }, {
    //         type: 'ListItem',
    //         content: [{ type: 'Text', value: '22'} ]
    //       }, {
    //         type: 'ListItem',
    //         content: [{ type: 'Text', value: '33'} ]
    //       }]
    //     }]
    //   })
    //
    //   const docElement = buildReactiveView(doc)
    //   document.body.appendChild(docElement)
    //   patchRichTextEvents(on, trigger)
    //   const firstElement = page.getByText('11')
    //   setCursor(firstElement, 0)
    //   await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
    //
    //   await user.keyboard('{Enter}')
    //   await waitUpdate()
    //   // 测试数据结构？
    //   await page.expect(() =>window.doc.root.children!.size()).to.equal(1)
    //   await page.expect(() =>window.doc.root.children!.at(0).children.size()).to.equal(4)
    //   await page.expect(() =>window.doc.root.children!.at(0).children.at(0).data.type).to.equal('ListItem')
    //
    //   // range 测试
    //   const range = getCursorRange()
    //
    //   await page.expect(() =>range.startContainer).to.equal(page.getByText('11').firstChild)
    //   await page.expect(() =>range.startOffset).to.equal(0)
    //   await page.expect(() =>range.collapsed).to.equal(true)
    //
    //   // 测试 dom
    //   const focusPElement = page.getByText('11').parentElement!.parentElement
    //   const newPElement = focusPElement!.previousSibling!
    //   await page.expect(() =>newPElement.nodeName).to.equal('DIV')
    //   await page.expect(() =>newPElement.childNodes.length).to.equal(2)
    //   await page.expect(() =>newPElement.firstChild!.firstChild.nodeName).to.equal('SPAN')
    //   await page.expect(() =>newPElement.textContent).to.equal('​')
    //   await page.expect(() =>docElement.textContent).to.equal('00​112233')
    // })
  })

  //
  // describe('at end of content', () => {
  //
  //   beforeEach(() => {
  //     document.body.innerHTML = ''
  //     removeAll()
  //   })
  //
  //   test('Para content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       children: [{
  //         type: 'Para',
  //         content: [
  //           {type: 'Text', value: '11'},
  //           {type: 'Text', value: '22'},
  //           {type: 'Text', value: '33'}
  //         ]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //
  //     const firstElement = page.getByText('33')
  //     setCursor(firstElement.firstChild, 2)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构？
  //
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(1).data.type).to.equal('Para')
  //
  //     // range 测试
  //     const range = getCursorRange()
  //
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('33').parentElement!.nextSibling!.firstChild!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //
  //     // 测试 dom
  //     const newPElement = page.getByText('33').parentElement!.nextSibling!
  //     await page.expect(() =>newPElement.nodeName).to.equal('P')
  //     await page.expect(() =>newPElement.childNodes.length).to.equal(1)
  //     await page.expect(() =>newPElement.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>newPElement.textContent).to.equal('​')
  //     await page.expect(() =>docElement.textContent).to.equal('112233​')
  //   })
  //
  //   test('Section content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       content: [{ type: 'Text', value: '00'} ],
  //       children: [{
  //         type: 'Section',
  //         content: [{type: 'Text', value: '11'}], // <- 这里回车
  //         children: [{
  //           type: 'Para',
  //           content: [
  //             {type: 'Text', value: '22'},
  //           ]
  //         }]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //     setCursor(page.getByText('11').firstChild, 2)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(1)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(0).data.type).to.equal('Para')
  //
  //     // range 测试
  //     const range = getCursorRange()
  //     //从 11 这个 span开始依次是: span h1 div p span Text
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('11').parentElement!.nextSibling!.firstChild!.firstChild!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //
  //     // 测试 dom
  //     const newPElement = page.getByText('11').parentElement!.nextSibling.firstChild!
  //     await page.expect(() =>newPElement.nodeName).to.equal('P')
  //     await page.expect(() =>newPElement.childNodes.length).to.equal(1)
  //     await page.expect(() =>newPElement.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>newPElement.textContent).to.equal('​')
  //     await page.expect(() =>docElement.textContent).to.equal('0011​22')
  //   })
  //   //
  //   test('Listitem content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       content: [{ type: 'Text', value: '00'} ],
  //       children: [{
  //         type: 'List',
  //         children: [{
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '11'} ]
  //         }, {
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '22'} ] //<- 这里
  //         }, {
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '33'} ]
  //         }]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //     setCursor(page.getByText('22')!.firstChild!, 2)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构？
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(1)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.size()).to.equal(4)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(0).data.type).to.equal('ListItem')
  //
  //     // range 测试
  //     const range = getCursorRange()
  //     // 从 11 开始依次是 span div div div(new ListItem) div span Text
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('22')!.parentElement!.parentElement!.nextSibling!.firstChild!.firstChild!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //
  //     // 测试 dom
  //     const newPElement = page.getByText('22').parentElement!.parentElement!.nextSibling!
  //     await page.expect(() =>newPElement.nodeName).to.equal('DIV')
  //     await page.expect(() =>newPElement.childNodes.length).to.equal(2)
  //     await page.expect(() =>newPElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>newPElement.textContent).to.equal('​')
  //     await page.expect(() =>docElement.textContent).to.equal('001122​33')
  //   })
  // })
  //
  // describe('at middle of content', () => {
  //
  //   beforeEach(() => {
  //     document.body.innerHTML = ''
  //     removeAll()
  //   })
  //
  //   test('Para content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       children: [{
  //         type: 'Para',
  //         content: [
  //           {type: 'Text', value: '11'},
  //           {type: 'Text', value: '22'},
  //           {type: 'Text', value: '33'}
  //         ]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //
  //     const firstElement = page.getByText('22')
  //     setCursor(firstElement.firstChild, 1)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构？
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(0).data.type).to.equal('Para')
  //     await page.expect(() =>window.doc.root.children!.at(0).content.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(0).content.at(0).value.value).to.equal('11')
  //     await page.expect(() =>window.doc.root.children!.at(0).content.at(1).value.value).to.equal('2')
  //     await page.expect(() =>window.doc.root.children!.at(1).data.type).to.equal('Para')
  //     await page.expect(() =>window.doc.root.children!.at(1).content.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(1).content.at(0).value.value).to.equal('2')
  //     await page.expect(() =>window.doc.root.children!.at(1).content.at(1).value.value).to.equal('33')
  //
  //
  //     // range 测试
  //     const range = getCursorRange()
  //
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('33')!.previousSibling!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //
  //     // 测试 dom
  //     const newPElement = page.getByText('33').parentElement!
  //     await page.expect(() =>newPElement.nodeName).to.equal('P')
  //     await page.expect(() =>newPElement.childNodes.length).to.equal(2)
  //     await page.expect(() =>newPElement.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>newPElement.textContent).to.equal('233')
  //     await page.expect(() =>docElement.textContent).to.equal('112233')
  //
  //     const oldPElement = page.getByText('11').parentElement!
  //     await page.expect(() =>oldPElement.nodeName).to.equal('P')
  //     await page.expect(() =>oldPElement.childNodes.length).to.equal(2)
  //     await page.expect(() =>oldPElement.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>oldPElement.textContent).to.equal('112')
  //   })
  //
  //   test('Section content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       content: [{ type: 'Text', value: '00'} ],
  //       children: [{
  //         type: 'Section',
  //         content: [
  //             {type: 'Text', value: '11'},
  //             {type: 'Text', value: '22'}, // <-- 这里
  //             {type: 'Text', value: '33'}
  //         ], // <- 这里回车
  //         children: [{
  //           type: 'Para',
  //           content: [
  //             {type: 'Text', value: '44'},
  //           ]
  //         }]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //     setCursor(page.getByText('22').firstChild!, 1)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构
  //
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(0).data.type).to.equal('Section')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.size()).to.equal(0)
  //
  //     await page.expect(() =>window.doc.root.children!.at(0).content.size()).to.equal(2)
  //
  //     await page.expect(() =>window.doc.root.children!.at(1).data.type).to.equal('Section')
  //     await page.expect(() =>window.doc.root.children!.at(1).content.size()).to.equal(2)
  //     await page.expect(() =>window.doc.root.children!.at(1).children.size()).to.equal(1)
  //     //
  //     // range 测试
  //     const range = getCursorRange()
  //     //从 33 这个 span开始依次是: span span Text
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('33')!.previousSibling!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //     //
  //     // 测试 dom
  //     const firstElement = page.getByText('11').parentElement!.parentElement!
  //     await page.expect(() =>firstElement.nodeName).to.equal('DIV')
  //     await page.expect(() =>firstElement.firstChild!.childNodes.length).to.equal(2)
  //     await page.expect(() =>firstElement.firstChild!.textContent).to.equal('112')
  //     await page.expect(() =>firstElement.textContent).to.equal('112')
  //
  //     const secondElement = firstElement.nextSibling
  //     await page.expect(() =>secondElement.nodeName).to.equal('DIV')
  //     await page.expect(() =>secondElement.firstChild!.childNodes.length).to.equal(2)
  //     await page.expect(() =>secondElement.firstChild!.textContent).to.equal('233')
  //     await page.expect(() =>secondElement.textContent).to.equal('23344')
  //
  //     await page.expect(() =>docElement.textContent).to.equal('0011223344')
  //   })
  //   // //
  //   test('ListItem content', async () => {
  //     const user = userEvent.setup({ document })
  //     const { result: doc } = buildModelFromData({
  //       type: 'Doc',
  //       content: [{ type: 'Text', value: '00'} ],
  //       children: [{
  //         type: 'List',
  //         children: [{
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '11'} ]
  //         }, {
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '22'} ] //<- 这里
  //         }, {
  //           type: 'ListItem',
  //           content: [{ type: 'Text', value: '33'} ]
  //         }]
  //       }]
  //     })
  //
  //     const docElement = buildReactiveView(doc)
  //     document.body.appendChild(docElement)
  //     patchRichTextEvents(on, trigger)
  //     setCursor(page.getByText('22').firstChild, 1)
  //     await page.expect(() =>window.getSelection()!.rangeCount).to.equal(1)
  //
  //     await user.keyboard('{Enter}')
  //     await waitUpdate()
  //     // 测试数据结构？
  //     await page.expect(() =>window.doc.root.children!.size()).to.equal(1)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.size()).to.equal(4)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(0).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(1).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(2).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(3).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(1).content.size()).to.equal(1)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(1).content.at(0).value.value).to.equal('2')
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(2).content.size()).to.equal(1)
  //     await page.expect(() =>window.doc.root.children!.at(0).children.at(2).content.at(0).value.value).to.equal('2')
  //
  //     // range 测试
  //     const range = getCursorRange()
  //     // 从 11 开始依次是 span div div div(new ListItem) div span Text
  //     await page.expect(() =>range.startContainer).to.equal(page.getByText('33').parentElement!.parentElement!.previousSibling!.firstChild.firstChild!.firstChild)
  //     await page.expect(() =>range.startOffset).to.equal(0)
  //     await page.expect(() =>range.collapsed).to.equal(true)
  //     //
  //     // // 测试 dom
  //     const firstElement = page.getByText('11').parentElement!.parentElement!.nextSibling!
  //     await page.expect(() =>firstElement.nodeName).to.equal('DIV')
  //     await page.expect(() =>firstElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>firstElement.textContent).to.equal('2')
  //
  //     const secondElement = firstElement.nextSibling!
  //     await page.expect(() =>secondElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
  //     await page.expect(() =>secondElement.textContent).to.equal('2')
  //
  //     await page.expect(() =>docElement.textContent).to.equal('00112233')
  //   })
  // })
})