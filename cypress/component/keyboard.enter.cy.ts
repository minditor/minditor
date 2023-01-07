import userEvent from "@testing-library/user-event";
import {buildModelFromData} from "../../src/editing";
import {buildReactiveView, waitUpdate} from "../../src/buildReactiveView";
import {screen} from "@testing-library/dom";
import { on, trigger, removeAll} from '../../src/event'
import patchTextEvents from '../../src/patchTextEvents'

function setCursor(el: HTMLElement|Node, offset: number) {
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
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)

      const firstElement = screen.getByText('11')
      setCursor(firstElement, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？

      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(0).data.type).to.equal('Para')

      // range 测试
      const range = getCursorRange()

      const currentElement = screen.getByText('11')
      console.log(currentElement)
      expect(range.startContainer).to.equal(screen.getByText('11').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const focusPElement = screen.getByText('11').parentElement
      const newPElement = focusPElement!.previousSibling!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(1)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      expect(docElement.textContent).to.equal('​112233')
    })

    it('Section content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'Section',
          content: [{type: 'Text', value: '11'}] // <-- 这里
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      const firstElement = screen.getByText('11')
      setCursor(firstElement, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(0).data.type).to.equal('Para')

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('11').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const focusPElement = screen.getByText('11').parentElement!.parentElement
      const newPElement = focusPElement!.previousSibling!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(1)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      // 后面还有一个 ​ 是因为本来 Section 创建的时候就会创建一个默认的 children
      expect(docElement.textContent).to.equal('00​11')
    })

    it('Listitem content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'List',
          children: [{
            type: 'ListItem',
            content: [{ type: 'Text', value: '11'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '22'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '33'} ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      const firstElement = screen.getByText('11')
      setCursor(firstElement, 0)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(1)
      expect(doc.children!.at(0).children.size()).to.equal(4)
      expect(doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('11').firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const focusPElement = screen.getByText('11').parentElement!.parentElement
      const newPElement = focusPElement!.previousSibling!
      expect(newPElement.nodeName).to.equal('DIV')
      expect(newPElement.childNodes.length).to.equal(2)
      expect(newPElement.firstChild!.firstChild.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      expect(docElement.textContent).to.equal('00​112233')
    })
  })


  describe('at end of content', () => {

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
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)

      const firstElement = screen.getByText('33')
      setCursor(firstElement.firstChild, 2)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？

      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(1).data.type).to.equal('Para')

      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('33').parentElement!.nextSibling!.firstChild!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const newPElement = screen.getByText('33').parentElement!.nextSibling!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(1)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      expect(docElement.textContent).to.equal('112233​')
    })

    it('Section content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'Section',
          content: [{type: 'Text', value: '11'}], // <- 这里回车
          children: [{
            type: 'Para',
            content: [
              {type: 'Text', value: '22'},
            ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      setCursor(screen.getByText('11').firstChild, 2)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构
      expect(doc.children!.size()).to.equal(1)
      expect(doc.children!.at(0).children.size()).to.equal(2)
      expect(doc.children!.at(0).children.at(0).data.type).to.equal('Para')

      // range 测试
      const range = getCursorRange()
      //从 11 这个 span开始依次是: span h1 div p span Text
      expect(range.startContainer).to.equal(screen.getByText('11').parentElement!.nextSibling!.firstChild!.firstChild!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const newPElement = screen.getByText('11').parentElement!.nextSibling.firstChild!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(1)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      expect(docElement.textContent).to.equal('0011​22')
    })
    //
    it('Listitem content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'List',
          children: [{
            type: 'ListItem',
            content: [{ type: 'Text', value: '11'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '22'} ] //<- 这里
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '33'} ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      setCursor(screen.getByText('22')!.firstChild!, 2)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(1)
      expect(doc.children!.at(0).children.size()).to.equal(4)
      expect(doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')

      // range 测试
      const range = getCursorRange()
      // 从 11 开始依次是 span div div div(new ListItem) div span Text
      expect(range.startContainer).to.equal(screen.getByText('22')!.parentElement!.parentElement!.nextSibling!.firstChild!.firstChild!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const newPElement = screen.getByText('22').parentElement!.parentElement!.nextSibling!
      expect(newPElement.nodeName).to.equal('DIV')
      expect(newPElement.childNodes.length).to.equal(2)
      expect(newPElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('​')
      expect(docElement.textContent).to.equal('001122​33')
    })
  })

  describe('at middle of content', () => {

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
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)

      const firstElement = screen.getByText('22')
      setCursor(firstElement.firstChild, 1)
      expect(window.getSelection()!.rangeCount).to.equal(1)


      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(0).data.type).to.equal('Para')
      expect(doc.children!.at(0).content.size()).to.equal(2)
      expect(doc.children!.at(0).content.at(0).value.value).to.equal('11')
      expect(doc.children!.at(0).content.at(1).value.value).to.equal('2')
      expect(doc.children!.at(1).data.type).to.equal('Para')
      expect(doc.children!.at(1).content.size()).to.equal(2)
      expect(doc.children!.at(1).content.at(0).value.value).to.equal('2')
      expect(doc.children!.at(1).content.at(1).value.value).to.equal('33')


      // range 测试
      const range = getCursorRange()

      expect(range.startContainer).to.equal(screen.getByText('33')!.previousSibling!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)

      // 测试 dom
      const newPElement = screen.getByText('33').parentElement!
      expect(newPElement.nodeName).to.equal('P')
      expect(newPElement.childNodes.length).to.equal(2)
      expect(newPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(newPElement.textContent).to.equal('233')
      expect(docElement.textContent).to.equal('112233')

      const oldPElement = screen.getByText('11').parentElement!
      expect(oldPElement.nodeName).to.equal('P')
      expect(oldPElement.childNodes.length).to.equal(2)
      expect(oldPElement.firstChild!.nodeName).to.equal('SPAN')
      expect(oldPElement.textContent).to.equal('112')
    })

    it('Section content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'Section',
          content: [
              {type: 'Text', value: '11'},
              {type: 'Text', value: '22'}, // <-- 这里
              {type: 'Text', value: '33'}
          ], // <- 这里回车
          children: [{
            type: 'Para',
            content: [
              {type: 'Text', value: '44'},
            ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      setCursor(screen.getByText('22').firstChild!, 1)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构

      expect(doc.children!.size()).to.equal(2)
      expect(doc.children!.at(0).data.type).to.equal('Section')
      expect(doc.children!.at(0).children.size()).to.equal(0)

      expect(doc.children!.at(0).content.size()).to.equal(2)

      expect(doc.children!.at(1).data.type).to.equal('Section')
      expect(doc.children!.at(1).content.size()).to.equal(2)
      expect(doc.children!.at(1).children.size()).to.equal(1)
      //
      // range 测试
      const range = getCursorRange()
      //从 33 这个 span开始依次是: span span Text
      expect(range.startContainer).to.equal(screen.getByText('33')!.previousSibling!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      //
      // 测试 dom
      const firstElement = screen.getByText('11').parentElement!.parentElement!
      expect(firstElement.nodeName).to.equal('DIV')
      expect(firstElement.firstChild!.childNodes.length).to.equal(2)
      expect(firstElement.firstChild!.textContent).to.equal('112')
      expect(firstElement.textContent).to.equal('112')

      const secondElement = firstElement.nextSibling
      expect(secondElement.nodeName).to.equal('DIV')
      expect(secondElement.firstChild!.childNodes.length).to.equal(2)
      expect(secondElement.firstChild!.textContent).to.equal('233')
      expect(secondElement.textContent).to.equal('23344')

      expect(docElement.textContent).to.equal('0011223344')
    })
    // //
    it('ListItem content', async () => {
      const user = userEvent.setup({ document })
      const { result: doc } = buildModelFromData({
        type: 'Doc',
        content: [{ type: 'Text', value: '00'} ],
        children: [{
          type: 'List',
          children: [{
            type: 'ListItem',
            content: [{ type: 'Text', value: '11'} ]
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '22'} ] //<- 这里
          }, {
            type: 'ListItem',
            content: [{ type: 'Text', value: '33'} ]
          }]
        }]
      })

      const docElement = buildReactiveView(doc)
      document.body.appendChild(docElement)
      patchTextEvents(on, trigger)
      setCursor(screen.getByText('22').firstChild, 1)
      expect(window.getSelection()!.rangeCount).to.equal(1)

      await user.keyboard('{Enter}')
      await waitUpdate()
      // 测试数据结构？
      expect(doc.children!.size()).to.equal(1)
      expect(doc.children!.at(0).children.size()).to.equal(4)
      expect(doc.children!.at(0).children.at(0).data.type).to.equal('ListItem')
      expect(doc.children!.at(0).children.at(1).data.type).to.equal('ListItem')
      expect(doc.children!.at(0).children.at(2).data.type).to.equal('ListItem')
      expect(doc.children!.at(0).children.at(3).data.type).to.equal('ListItem')
      expect(doc.children!.at(0).children.at(1).content.size()).to.equal(1)
      expect(doc.children!.at(0).children.at(1).content.at(0).value.value).to.equal('2')
      expect(doc.children!.at(0).children.at(2).content.size()).to.equal(1)
      expect(doc.children!.at(0).children.at(2).content.at(0).value.value).to.equal('2')

      // range 测试
      const range = getCursorRange()
      // 从 11 开始依次是 span div div div(new ListItem) div span Text
      expect(range.startContainer).to.equal(screen.getByText('33').parentElement!.parentElement!.previousSibling!.firstChild.firstChild!.firstChild)
      expect(range.startOffset).to.equal(0)
      expect(range.collapsed).to.equal(true)
      //
      // // 测试 dom
      const firstElement = screen.getByText('11').parentElement!.parentElement!.nextSibling!
      expect(firstElement.nodeName).to.equal('DIV')
      expect(firstElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
      expect(firstElement.textContent).to.equal('2')

      const secondElement = firstElement.nextSibling!
      expect(secondElement.firstChild!.firstChild!.nodeName).to.equal('SPAN')
      expect(secondElement.textContent).to.equal('2')

      expect(docElement.textContent).to.equal('00112233')
    })
  })
})