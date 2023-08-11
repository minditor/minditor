import {DocumentContent} from "../src/Document";
import {DocumentContentView} from "../src/View";
import {Paragraph, Section, Text} from "../src/DocNode";
import {getByText} from '@testing-library/dom'
import {expect, describe, test} from "@jest/globals";

const BuiltinTypes = {Paragraph, Section, Text}

function getByTestID(element: HTMLElement, id: string) {
    return element.querySelector(`[data-testid='${id}']`)
}

describe('insert', () => {
    test('insert content node to para', async () => {
        const doc = new DocumentContent([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: '11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33'}
            ]
        }], BuiltinTypes)
        const view = (new DocumentContentView(doc)).render()

        doc.insertContentNodeAfter(new Text({type:'Text', value:'44'}), doc.firstChild!.content!.next!)
        
        expect(view.textContent).toBe('11224433')
        doc.insertContentNodeAfter(new Text({type:'Text', value:'555'}), doc.firstChild!.content!.next!.next!)
        
        expect(view.textContent).toBe('11224455533')
    })

    test('insert content node to Para in Section', async () => {
        const doc = new DocumentContent([{
            type: 'Section',
            content: [{type: 'Text', value: 'title'}],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '44'},
                    {type: 'Text', value: '55'},
                    {type: 'Text', value: '66'}
                ]
            }]
        }], BuiltinTypes)

        const view = new DocumentContentView(doc).render()

        expect(view.textContent).toBe('title112233445566')
        doc.insertContentNodeAfter(new Text({type:'Text', value:'99'}), doc.firstChild!.firstChild!.content!.next!)

        expect(view.textContent).toBe('title11229933445566')
    })
})

describe('update range', () => {
    test('update range in same content', async () => {
        const doc = new DocumentContent([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: '11', testid:'11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33', testid:'33'}
            ]
        }], BuiltinTypes)

        const view = new DocumentContentView(doc)
        const element = view.render()

        const range = document.createRange()
        // range.setStart(getByText(element, '11'), 1)
        // range.setEnd(getByText(element!, '33'), 1)
        // FIXME @testing-library/dom 失效
        range.setStart(element.querySelector("[data-testid='11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='33']")!, 1)

        view.updateRange(range, '$$$')
        const newData = doc.toJSON()
        expect(newData.length).toBe(1)
        expect(newData[0].content.length).toBe(2)
        expect(newData[0].content[0].value).toBe('1$$$')
        expect(newData[0].content[1].value).toBe('3')
        expect(element.textContent).toBe('1$$$3')
    })

    test('update range in sibling node content', async () => {
        const content = new DocumentContent([{
            type: 'Section',
            content: [
                {type: 'Text', value: 'section'}
            ],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid:'pt11'}, //<--start
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt21'},
                    {type: 'Text', value: 'pt22'},
                    {type: 'Text', value: 'pt23'}
                ]
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt31'},
                    {type: 'Text', value: 'pt32', testid:'pt32'},//<--end
                    {type: 'Text', value: 'pt33'}
                ]
            }]
        }], BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()
        const range = document.createRange()
        range.setStart(element.querySelector("[data-testid='pt11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='pt32']")!, 1)

        view.updateRange(range, '$$$')
        expect(element.textContent).toBe('sectionp$$$t32pt33')
    })

    test('update range in different tree level', async () => {

        const content = new DocumentContent([{
            type: 'Section',
            content: [
                {type: 'Text', value: 'section'}
            ],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid: 'pt11'},// <-- from here
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt21'},
                    {type: 'Text', value: 'pt22'},
                    {type: 'Text', value: 'pt23'}
                ]
            }, {
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.1'},
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt111'},
                        {type: 'Text', value: 'pt112'},
                        {type: 'Text', value: 'pt113'}
                    ]
                }, {
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt121'},
                        {type: 'Text', value: 'pt122', testid: 'pt122'}, //<-- to here
                        {type: 'Text', value: 'pt123'}
                    ]
                },{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt131'},
                        {type: 'Text', value: 'pt132'},
                        {type: 'Text', value: 'pt133'}
                    ]
                }]
            }]
        }], BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = element.querySelector("[data-testid='pt11']")!
        const to = element.querySelector("[data-testid='pt122']")!

        range.setStart(from, 1)
        range.setEnd(to, 1)
        view.updateRange(range, '$$$')
        debugger

        debugger
        expect(element.textContent).toBe('sectionp$$$t122pt123pt131pt132pt133')
        console.clear()
        console.log(element.textContent)
    })

    // TODO 如果是 children 相兼容的情况，要合并 children
    test('update range in different tree level and merge endNode children', async () => {

        const content = new DocumentContent([{
            type: 'Section',
            content: [
                {type: 'Text', value: 'section', testid:'section'} // <-- from here
            ],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.1', testid: 'section1.1'}, // <-- to here
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt111'},
                        {type: 'Text', value: 'pt112'},
                        {type: 'Text', value: 'pt113'}
                    ]
                }]
            }]
        }], BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        const to = getByTestID(element,'section1.1')!
        console.log(from, to)

        range.setStart(from, 1)
        range.setEnd(to, 1)
        view.updateRange(range, '$$$')

        expect(element.textContent).toBe('s$$$ection1.1pt111pt112pt113')
    })
    //

    // TODO 还有不兼容的情况
})
//
//
// describe('format range', () => {
//     test('format content in single node', async () => {
//         const content = new DocumentContent({
//             type: 'Paragraph',
//             content: [
//                 {type: 'Text', value: '11111'},
//             ]
//         })
//
//         doc.render()
//
//         const range = document.createRange()
//         const container = within(doc.element!).getByText('11111').firstChild! as Node
//         range.setStart(container, 1)
//         range.setEnd(container, 3)
//
//         doc.formatRange(range, {bold: true})
//
//         expect(view.textContent).toBe('11111')
//         expect(doc.firstChild.content!.size()).toBe(3)
//         expect(doc.firstChild.content!.at(0).value.value).toBe('1')
//         expect(doc.firstChild.content!.at(1).value.value).toBe('11')
//         expect(doc.firstChild.content!.at(2).value.value).toBe('11')
//
//         // TODO 验证样式
//     })
//
//     // TODO 跨越父元素来 format
// })
//
//
// describe('split text as block', () => {
//     test('split para', async () => {
//         const content = new DocumentContent({
//             type: 'Section',
//             content: [
//                 {type: 'Text', value: 'title'},
//             ],
//             children: [{
//                 type: 'Paragraph',
//                 content: [{
//                     type: 'Text', value: 'para1'
//                 }]
//             }]
//         })
//
//         doc.render()
//         const range = document.createRange()
//         const container = within(doc.element!).getByText('para1').firstChild! as Node
//         range.setStart(container, 1)
//         range.setEnd(container, 1)
//         await doc.splitTextAsBlock(range)
//
//         expect(doc.firstChild.children!.size()).toBe(2)
//         expect(doc.firstChild.children!.at(0).content.size()).toBe(1)
//         expect(doc.firstChild.children!.at(0).content.at(0).value.value).toBe('p')
//         expect(doc.firstChild.children!.at(1).content.size()).toBe(1)
//         expect(doc.firstChild.children!.at(1).content.at(0).value.value).toBe('ara1')
//
//     })
// })


export {}