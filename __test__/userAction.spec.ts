import {buildReactiveView, waitUpdate} from "../src/buildReactiveView";
// @ts-ignore
import {buildModelFromData, formatRange, insertContentNodeAfter, splitTextAsBlock, updateRange} from "../src/editing";
import patchRichTextEvents from '../src/patchRichTextEvents'
import { on, trigger, removeAll} from '../src/event'
import { screen } from "@testing-library/dom";
import {expect} from "@jest/globals";
import userEvent from '@testing-library/user-event'



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

        test('Para content', async () => {
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
            patchRichTextEvents(on, trigger)

            const firstElement = screen.getByText('11')
            setCursor(firstElement, 0)
            expect(window.getSelection()!.rangeCount).toBe(1)


            await user.keyboard('{Enter}')
            await waitUpdate()
            // 测试数据结构？

            expect(doc.children!.size()).toBe(2)
            expect(doc.children!.at(0).data.type).toBe('Para')

            // range 测试
            const range = getCursorRange()

            const currentElement = screen.getByText('11')
            console.log(currentElement)
            expect(range.startContainer).toBe(screen.getByText('11').firstChild)
            expect(range.startOffset).toBe(0)
            expect(range.collapsed).toBe(true)

            // 测试 dom
            const focusPElement = screen.getByText('11').parentElement
            const newPElement = focusPElement!.previousSibling!
            expect(newPElement.nodeName).toBe('P')
            expect(newPElement.childNodes.length).toBe(1)
            expect(newPElement.firstChild!.nodeName).toBe('SPAN')
            expect(newPElement.textContent).toBe('​')
            expect(docElement.textContent).toBe('​112233')
        })

        test('Section content', async () => {
            const user = userEvent.setup({ document })
            const { result: doc } = buildModelFromData({
                type: 'Doc',
                content: [{ type: 'Text', value: '00'} ],
                children: [{
                    type: 'Section',
                    content: [{type: 'Text', value: '11'}]
                }]
            })

            const docElement = buildReactiveView(doc)
            document.body.appendChild(docElement)
            patchRichTextEvents(on, trigger)
            const firstElement = screen.getByText('11')
            setCursor(firstElement, 0)
            expect(window.getSelection()!.rangeCount).toBe(1)


            await user.keyboard('{Enter}')
            await waitUpdate()
            // 测试数据结构？
            expect(doc.children!.size()).toBe(2)
            expect(doc.children!.at(0).data.type).toBe('Para')

            // range 测试
            const range = getCursorRange()

            const currentElement = screen.getByText('11')
            console.log(currentElement)
            expect(range.startContainer).toBe(screen.getByText('11').firstChild)
            expect(range.startOffset).toBe(0)
            expect(range.collapsed).toBe(true)

            // 测试 dom
            const focusPElement = screen.getByText('11').parentElement!.parentElement
            const newPElement = focusPElement!.previousSibling!
            expect(newPElement.nodeName).toBe('P')
            expect(newPElement.childNodes.length).toBe(1)
            expect(newPElement.firstChild!.nodeName).toBe('SPAN')
            expect(newPElement.textContent).toBe('​')
            expect(docElement.textContent).toBe('00​11')
        })

        test('ListItem content', async () => {

        })
    })



})



export {}