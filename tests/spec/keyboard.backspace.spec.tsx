/**@jsx createElement*/
import {createElement} from './mock'
import {test, expect, Locator} from '@playwright/test';

import { data as singleParaData } from '../server/data/singlePara'
import { data as singleListData } from '../server/data/singleList'
import { data as singleSectionData } from '../server/data/singleSection'
import { data as multiSectionData } from '../server/data/multiSection'
// import { data } from './data/component'
// import { data } from './data/nestedList'
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
//     it('ListItem content first level item', async () => {
//       const user = userEvent.setup({ document })
//       const { result: doc } = buildModelFromData({
//         type: 'Doc',
//         content: [{ type: 'Text', value: '00'} ],
//         children: [{
//           type: 'List',
//           children: [{
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '22'} ]
//           }, {
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '33'} ] // <-- 这里
//           }, {
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '44'} ]
//           }]
//         }]
//       })
//
//       const docElement = buildReactiveView(doc)
//       document.body.appendChild(docElement)
//       patchRichTextEvents(on, trigger)
//       const firstElement = screen.getByText('33')
//       setCursor(firstElement.firstChild, 0)
//       expect(window.getSelection()!.rangeCount).to.equal(1)
//
//       await user.keyboard('{Backspace}')
//       await waitUpdate()
//       // 测试数据结构？
//       expect(doc.children!.size()).to.equal(3)
//
//       expect(doc.children!.at(0).data.type).to.equal('List')
//       expect(doc.children!.at(0).children.size()).to.equal(1)
//       expect(doc.children!.at(0).children.at(0).content.at(0).value.value).to.equal('22')
//
//       expect(doc.children!.at(1).data.type).to.equal('Para')
//       expect(doc.children!.at(1).content.size()).to.equal(1)
//       expect(doc.children!.at(1).content.at(0).value.value).to.equal('33')
//
//       expect(doc.children!.at(2).data.type).to.equal('List')
//       expect(doc.children!.at(2).children.size()).to.equal(1)
//       expect(doc.children!.at(2).children.at(0).content.at(0).value.value).to.equal('44')
//
//       // range 测试
//       const range = getCursorRange()
//
//       expect(range.startContainer).to.equal(screen.getByText('33').firstChild)
//       expect(range.startOffset).to.equal(0)
//       expect(range.collapsed).to.equal(true)
//       //
//       // 测试 dom
//       const newPElement = screen.getByText('33').parentElement!
//       expect(newPElement.nodeName).to.equal('P')
//       expect(newPElement.childNodes.length).to.equal(1)
//       expect(newPElement.textContent).to.equal('33')
//
//       const nextElement= newPElement.nextSibling!
//       expect(nextElement.nodeName).to.equal('DIV')
//       expect(nextElement.childNodes.length).to.equal(1)
//       expect(nextElement.textContent).to.equal('44')
//
//       const prevElement= newPElement.previousSibling!
//       expect(prevElement.nodeName).to.equal('DIV')
//       expect(prevElement.childNodes.length).to.equal(1)
//       expect(prevElement.textContent).to.equal('22')
//
//       expect(docElement.textContent).to.equal('00223344')
//     })
//
//
//     it('ListItem content second level item', async () => {
//       const user = userEvent.setup({ document })
//       const { result: doc } = buildModelFromData({
//         type: 'Doc',
//         content: [{ type: 'Text', value: '00'} ],
//         children: [{
//           type: 'List',
//           children: [{
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '22'} ]
//           }, {
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '33'} ],
//             children: [{
//               type: 'ListItem',
//               content: [{ type: 'Text', value: '44'} ],// <-- 这里
//               children: [{
//                 type: 'ListItem',
//                 content: [{ type: 'Text', value: '55'} ]
//               }]
//             }]
//           }, {
//             type: 'ListItem',
//             content: [{ type: 'Text', value: '66'} ]
//           }]
//         }]
//       })
//
//       const docElement = buildReactiveView(doc)
//       document.body.appendChild(docElement)
//       patchRichTextEvents(on, trigger)
//       const firstElement = screen.getByText('44')
//       setCursor(firstElement.firstChild, 0)
//       expect(window.getSelection()!.rangeCount).to.equal(1)
//
//       await user.keyboard('{Backspace}')
//       await waitUpdate()
//       // 测试数据结构？
//       expect(doc.children!.size()).to.equal(1)
//
//       const listNode = doc.children!.at(0)!
//       expect(listNode.children.size()).to.equal(4)
//
//
//
//       expect(listNode.children.at(0).data.type).to.equal('ListItem')
//       expect(listNode.children.at(0).content.size()).to.equal(1)
//       expect(listNode.children.at(0).content.at(0).value.value).to.equal('22')
//
//       expect(listNode.children.at(1).data.type).to.equal('ListItem')
//       expect(listNode.children.at(1).content.size()).to.equal(1)
//       expect(listNode.children.at(1).content.at(0).value.value).to.equal('33')
//
//       expect(listNode.children.at(2).data.type).to.equal('ListItem')
//       expect(listNode.children.at(2).content.size()).to.equal(1)
//       expect(listNode.children.at(2).content.at(0).value.value).to.equal('44')
//       expect(listNode.children.at(2).children.size()).to.equal(1)
//       expect(listNode.children.at(2).children.at(0).data.type).to.equal('ListItem')
//       expect(listNode.children.at(2).children.at(0).content.at(0).value.value).to.equal('55')
//
//       expect(listNode.children.at(3).data.type).to.equal('ListItem')
//       expect(listNode.children.at(3).content.size()).to.equal(1)
//       expect(listNode.children.at(3).content.at(0).value.value).to.equal('66')
//
//
//       // range 测试
//       const range = getCursorRange()
//
//       expect(range.startContainer).to.equal(screen.getByText('44').firstChild)
//       expect(range.startOffset).to.equal(0)
//       expect(range.collapsed).to.equal(true)
//       // 测试 dom
//       const newPElement = screen.getByText('44').parentElement!.parentElement!
//       expect(newPElement.nodeName).to.equal('DIV')
//
//       const listElement = newPElement.parentElement!
//       expect(listElement.childNodes.length).to.equal(4)
//
//       expect(listElement.childNodes[0].textContent).to.equal('22')
//       expect(listElement.childNodes[1].textContent).to.equal('33')
//       expect(listElement.childNodes[2].textContent).to.equal('4455')
//       expect(listElement.childNodes[3].textContent).to.equal('66')
//
//       expect(docElement.textContent).to.equal('002233445566')
//     })
//
//   })
//
//
//
// })