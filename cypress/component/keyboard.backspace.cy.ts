import userEvent from "@testing-library/user-event";
import {buildModelFromData} from "../../src/editing";
import {buildReactiveView, waitUpdate} from "../../src/buildReactiveView";
import {screen} from "@testing-library/dom";
import { on, trigger, removeAll} from '../../src/event'
import patchTextEvents from '../../src/patchTextEvents'

function setCursor(el: HTMLElement, offset: number) {
  const range = document.createRange()
  range.setStart(el, offset)
  range.setEnd(el, offset)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

function getCursorRange() {
  return window.getSelection()!.getRangeAt(0)
}


describe('keyboard Enter actions', () => {

  describe('at head of content', () => {
    beforeEach(() => {
      document.body.innerHTML = ''
      removeAll()
    })

    it('Para content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        children: [{
          type: 'Para',
          content: [
            {type: 'Text', value: '11'},
            {type: 'Text', value: '22'},
            {type: 'Text', value: '33'}
          ]
        }, {
          type: 'Para',
          content: [
            {type: 'Text', value: '44'}, // <--这里
          ]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)

      const firstElement = screen.getByText('44')
      setCursor(firstElement.firstChild!, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Backspace}')
      await waitUpdate()
      // 测试数据结构？

      expect(doc.children!.size()).to.equal(1)
      expect(doc.children!.at(0).content.size()).to.equal(4)

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('44').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      //
      // // 测试 dom
      const newPElement = screen.getByText('44').parentElement
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(4)
      expect(newPElement.childNodes[0]!.textContent).to.equal('11')
      expect(newPElement.childNodes[1]!.textContent).to.equal('22')
      expect(newPElement.childNodes[2]!.textContent).to.equal('33')
      expect(newPElement.childNodes[3]!.textContent).to.equal('44')
      expect(docElement.textContent).to.equal('11223344')
    })



    it('Section content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'Para',
          content: [
            {type: 'Text', value: '11'},
          ]
        }, {
          type: 'Section',
          content: [{type: 'Text', value: '22'}], // <--这里
          children: [{
            type: 'Para',
            content: [
              {type: 'Text', value: '33'},
            ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      const firstElement = screen.getByText('22')
      setCursor(firstElement, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Backspace}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(0).data.type).to.equal('Para')
      expect(doc.children!.at(0).content.size()).to.equal(2)
      expect(doc.children!.at(0).content.at(0).value.value).to.equal('11')
      expect(doc.children!.at(0).content.at(1).value.value).to.equal('22')
      expect(doc.children!.at(1).data.type).to.equal('Para')
      expect(doc.children!.at(1).content.size()).to.equal(1)
      expect(doc.children!.at(1).content.at(0).value.value).to.equal('33')

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('22').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      //
      // // 测试 dom
      const newPElement = screen.getByText('11').parentElement!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(2)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.childNodes[0].textContent).to.equal('11')
      expect(newPElement.childNodes[1].textContent).to.equal('22')

      const secondElement = newPElement.nextSibling!
      expect(secondElement.nodeName).to.equal('P')
      expect(secondElement.childNodes.length).to.equal(1)
      expect(secondElement.firstChild!.nodeName).to.equal('SPAN')
      expect(secondElement.firstChild!.textContent).to.equal('33')

      expect(docElement.textContent).to.equal('00112233')
    })


    it('ListItem content first level item', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'List',
          children: [{
            type: 'ListItem',
            content: [{ type: 'Text', value: '22'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '33'} ] // <-- 这里
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '44'} ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      const firstElement = screen.getByText('33')
      setCursor(firstElement.firstChild, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Backspace}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(3)

      expect(doc.children!.at(0).data.type).to.equal('List')
      expect(doc.children!.at(0).children.size()).to.equal(1)
      expect(doc.children!.at(0).children.at(0).content.at(0).value.value).to.equal('22')

      expect(doc.children!.at(1).data.type).to.equal('Para')
      expect(doc.children!.at(1).content.size()).to.equal(1)
      expect(doc.children!.at(1).content.at(0).value.value).to.equal('33')

      expect(doc.children!.at(2).data.type).to.equal('List')
      expect(doc.children!.at(2).children.size()).to.equal(1)
      expect(doc.children!.at(2).children.at(0).content.at(0).value.value).to.equal('44')

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('33').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      //
      // 测试 dom
      const newPElement = screen.getByText('33').parentElement!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(1)
      expect(newPElement.textContent).to.equal('33')

      const nextElement= newPElement.nextSibling!
      expect(nextElement.nodeName).to.equal('DIV')
      expect(nextElement.childNodes.length).to.equal(1)
      expect(nextElement.textContent).to.equal('44')

      const prevElement= newPElement.previousSibling!
      expect(prevElement.nodeName).to.equal('DIV')
      expect(prevElement.childNodes.length).to.equal(1)
      expect(prevElement.textContent).to.equal('22')

      expect(docElement.textContent).to.equal('00223344')
    })


    it('ListItem content second level item', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'List',
          children: [{
            type: 'ListItem',
            content: [{ type: 'Text', value: '22'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '33'} ],
            children: [{
              type: 'ListItem',
              content: [{ type: 'Text', value: '44'} ],// <-- 这里
              children: [{
                type: 'ListItem',
                content: [{ type: 'Text', value: '55'} ]
              }]
            }]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '66'} ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      const firstElement = screen.getByText('44')
      setCursor(firstElement.firstChild, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Backspace}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(1)

      const listNode = doc.children!.at(0)!
      expect(listNode.children.size()).to.equal(4)



      expect(listNode.children.at(0).data.type).to.equal('ListItem')
      expect(listNode.children.at(0).content.size()).to.equal(1)
      expect(listNode.children.at(0).content.at(0).value.value).to.equal('22')

      expect(listNode.children.at(1).data.type).to.equal('ListItem')
      expect(listNode.children.at(1).content.size()).to.equal(1)
      expect(listNode.children.at(1).content.at(0).value.value).to.equal('33')

      expect(listNode.children.at(2).data.type).to.equal('ListItem')
      expect(listNode.children.at(2).content.size()).to.equal(1)
      expect(listNode.children.at(2).content.at(0).value.value).to.equal('44')
      expect(listNode.children.at(2).children.size()).to.equal(1)
      expect(listNode.children.at(2).children.at(0).data.type).to.equal('ListItem')
      expect(listNode.children.at(2).children.at(0).content.at(0).value.value).to.equal('55')

      expect(listNode.children.at(3).data.type).to.equal('ListItem')
      expect(listNode.children.at(3).content.size()).to.equal(1)
      expect(listNode.children.at(3).content.at(0).value.value).to.equal('66')


      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('44').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      // 测试 dom
      const newPElement = screen.getByText('44').parentElement!.parentElement!
      expect(newPElement.nodeName).to.equal('DIV')

      const listElement = newPElement.parentElement!
      expect(listElement.childNodes.length).to.equal(4)

      expect(listElement.childNodes[0].textContent).to.equal('22')
      expect(listElement.childNodes[1].textContent).to.equal('33')
      expect(listElement.childNodes[2].textContent).to.equal('4455')
      expect(listElement.childNodes[3].textContent).to.equal('66')

      expect(docElement.textContent).to.equal('002233445566')
    })

  })



})