import { test, expect, type Page } from '@playwright/test';
import './global.d.ts'
import { data as singleSectionData } from './server/data/singleSection'
// import { data } from './data/multiSection'
import { data as singleParaData } from './server/data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'


interface ExtendedPage extends Page {
  expect?: any
  expectAll?: any,
  load?: any
}


test.beforeEach(async ({ page }: {page: ExtendedPage}) => {
  // TODO 变成 global setup
  page.load = async (dataName: string = 'singlePara') => {
    await page.goto(`http://localhost:5179?data=${dataName}`);
    await expect(page.getByTestId('root')).not.toBeEmpty()
  }


  page.expect = async (pageFn: (...arg:any[]) => any, args?:any) => {
    return expect(await page.evaluate(pageFn, args)).toBeTruthy()
  }

  page.expectAll = async (pageFn: (...arg:any[]) => any, args?:any) => {
    return expect((await page.evaluate(pageFn, args)).every((item: any) => !!item)).toBeTruthy()
  }

});




test.describe('keyboard Enter actions', () => {

  test.describe('at head of content', () => {

    test('Para content', async ({page} : {page: ExtendedPage}) => {
      await page.load('singlePara')
      const data = singleParaData
      const firstText = data.children[0].content[0].value
      const allText = data.children[0].content.map(i => i.value).join('')
      // 1.1 设置焦点
      await page.evaluate((firstText) => {
        window.pw.actions.setSelection(window.pw.screen.getByText(firstText), 0)
      }, firstText)

      await page.expect(() => window.getSelection()!.rangeCount === 1)

      const rootHandle = page.getByTestId('root')

      // 1.2 执行动作
      await rootHandle.press('Enter')

      // 2.1 测试数据结构
      await page.expect(() => window.pw.doc.children!.size() === 2)
      await page.expect(() =>window.pw.doc.children!.at(0).data.type === 'Para')

      // 2.2 测试 dom
      await page.expectAll(([firstText, allText]: [t: string, a: string]) => {
        const focusPElement = window.pw.screen.getByText(firstText).parentElement
        const newPElement = focusPElement!.previousSibling!
        return [
          newPElement.nodeName === 'P',
          newPElement.childNodes.length === 1,
          newPElement.firstChild!.nodeName === 'SPAN',
          newPElement.textContent === '​',
          window.pw.docElement!.textContent === `​${allText}`
        ]
      }, [firstText, allText])

      // 2.3 range 测试
      await page.expectAll(([firstText, allText]: [t: string, a: string]) => {
        const range = window.pw.state.selectionRange
        const currentElement = window.pw.screen.getByText(firstText)
        return [
          range!.startContainer === currentElement.firstChild,
          range!.startOffset === 0,
          range!.collapsed
        ]
      }, [firstText, allText])

    })
    //
    // test('Section content', async () => {
    //   const user = userEvent.setup({ document })
    //   const { result: doc } = buildModelFromData({
    //     type: 'Doc',
    //     content: [{ type: 'Text', value: '00'} ],
    //     children: [{
    //       type: 'Section',
    //       content: [{type: 'Text', value: '11'}] // <-- 这里
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
    //
    //   await user.keyboard('{Enter}')
    //   await waitUpdate()
    //   // 测试数据结构？
    //   await page.expect(() =>window.pw.doc.children!.size()).to.equal(2)
    //   await page.expect(() =>window.pw.doc.children!.at(0).data.type).to.equal('Para')
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
    //   await page.expect(() =>newPElement.nodeName).to.equal('P')
    //   await page.expect(() =>newPElement.childNodes.length).to.equal(1)
    //   await page.expect(() =>newPElement.firstChild!.nodeName).to.equal('SPAN')
    //   await page.expect(() =>newPElement.textContent).to.equal('​')
    //   // 后面还有一个 ​ 是因为本来 Section 创建的时候就会创建一个默认的 children
    //   await page.expect(() =>docElement.textContent).to.equal('00​11')
    // })
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
    //   await page.expect(() =>window.pw.doc.children!.size()).to.equal(1)
    //   await page.expect(() =>window.pw.doc.children!.at(0).children.size()).to.equal(4)
    //   await page.expect(() =>window.pw.doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(1).data.type).to.equal('Para')
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(1)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(0).data.type).to.equal('Para')
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(1)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.size()).to.equal(4)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(0).data.type).to.equal('Para')
  //     await page.expect(() =>window.pw.doc.children!.at(0).content.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(0).content.at(0).value.value).to.equal('11')
  //     await page.expect(() =>window.pw.doc.children!.at(0).content.at(1).value.value).to.equal('2')
  //     await page.expect(() =>window.pw.doc.children!.at(1).data.type).to.equal('Para')
  //     await page.expect(() =>window.pw.doc.children!.at(1).content.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(1).content.at(0).value.value).to.equal('2')
  //     await page.expect(() =>window.pw.doc.children!.at(1).content.at(1).value.value).to.equal('33')
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(0).data.type).to.equal('Section')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.size()).to.equal(0)
  //
  //     await page.expect(() =>window.pw.doc.children!.at(0).content.size()).to.equal(2)
  //
  //     await page.expect(() =>window.pw.doc.children!.at(1).data.type).to.equal('Section')
  //     await page.expect(() =>window.pw.doc.children!.at(1).content.size()).to.equal(2)
  //     await page.expect(() =>window.pw.doc.children!.at(1).children.size()).to.equal(1)
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
  //     await page.expect(() =>window.pw.doc.children!.size()).to.equal(1)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.size()).to.equal(4)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(1).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(2).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(3).data.type).to.equal('ListItem')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(1).content.size()).to.equal(1)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(1).content.at(0).value.value).to.equal('2')
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(2).content.size()).to.equal(1)
  //     await page.expect(() =>window.pw.doc.children!.at(0).children.at(2).content.at(0).value.value).to.equal('2')
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