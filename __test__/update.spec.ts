import {buildReactiveView, waitUpdate} from "../src/buildReactiveView";
import { Doc, updateRange} from "../src/editing";
import { within } from "@testing-library/dom";
import {expect} from "@jest/globals";
// const { result: doc, firstLeaf, lastLeaf } = new Doc({
//     type: 'Para',
//     content: [
//         {type: 'Text', value: '11'},
//         {type: 'Text', value: '22'},
//         {type: 'Text', value: '33'}
//     ]
// })
//
// doc.firstLeaf = firstLeaf
// doc.lastLeaf = lastLeaf
// 
// document.getElementById('root').appendChild(doc.element!)
//
//
// doc.insertContentNodeAfter({type:'Text', value:'44'}, doc.content.head.next.next.node)
//
// for(let i of doc.content) {
//     console.log(i.value.value)
// }
// console.log("222222222")
// setTimeout(() => {
//     doc.insertContentNodeAfter({type:'Text', value:'555'}, doc.content.head.next.next.next.node)
//     for(let i of doc.content) {
//         console.log(i.value.value)
//     }
// }, 1)


describe('insert', () => {
    test('insert content node to para', async () => {
        const doc = new Doc({
            type: 'Para',
            content: [
                {type: 'Text', value: '11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33'}
            ]
        }, document.createElement('div'))
        doc.render()

        doc.insertContentNodeAfter({type:'Text', value:'44'}, doc.root!.content!.head.next.next.node)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('11224433')
        doc.insertContentNodeAfter({type:'Text', value:'555'}, doc.root.content!.head.next.next.next.node)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('11224455533')
    })

    test('insert content node to Para in Section', async () => {
        const doc = new Doc({
            type: 'Section',
            content: [{type: 'Text', value: 'title'}],
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
                    {type: 'Text', value: '44'},
                    {type: 'Text', value: '55'},
                    {type: 'Text', value: '66'}
                ]
            }]
        })

        expect(doc.element!.textContent).toBe('title112233445566')
        doc.insertContentNodeAfter({type:'Text', value:'99'}, doc.root.children!.head.next.node.content!.head.next.next.node)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('title11229933445566')
    })
})

describe('update range', () => {
    test('update range in same content', async () => {
        const doc = new Doc({
            type: 'Para',
            content: [
                {type: 'Text', value: '11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33'}
            ]
        })


        const range = document.createRange()
        range.setStart(within(doc.element!).getByText('11'), 1)
        range.setEnd(within(doc.element!).getByText('33'), 1)

        updateRange(range, '$$$', false)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('1$$$3')
    })

    test('update range in sibling node content', async () => {
        const doc = new Doc({
            type: 'Section',
            content: [
                {type: 'Text', value: 'section'}
            ],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Para',
                content: [
                    {type: 'Text', value: 'pt21'},
                    {type: 'Text', value: 'pt22'},
                    {type: 'Text', value: 'pt23'}
                ]
            }, {
                type: 'Para',
                content: [
                    {type: 'Text', value: 'pt31'},
                    {type: 'Text', value: 'pt32'},
                    {type: 'Text', value: 'pt33'}
                ]
            }]
        })


        const range = document.createRange()
        range.setStart(within(doc.element!).getByText('pt11'), 1)
        range.setEnd(within(doc.element!).getByText('pt32'), 1)

        updateRange(range, '$$$', false)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('sectionp$$$t32pt33')
    })

    test('update range in different tree level', async () => {

        const doc = new Doc({
            type: 'Section',
            content: [
                {type: 'Text', value: 'section'}
            ],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: 'pt11'},// <-- from here
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Para',
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
                    type: 'Para',
                    content: [
                        {type: 'Text', value: 'pt111'},
                        {type: 'Text', value: 'pt112'},
                        {type: 'Text', value: 'pt113'}
                    ]
                }, {
                    type: 'Para',
                    content: [
                        {type: 'Text', value: 'pt121'},
                        {type: 'Text', value: 'pt122'}, //<-- to here
                        {type: 'Text', value: 'pt123'}
                    ]
                },{
                    type: 'Para',
                    content: [
                        {type: 'Text', value: 'pt131'},
                        {type: 'Text', value: 'pt132'},
                        {type: 'Text', value: 'pt133'}
                    ]
                }]
            }]
        })

        

        const range = document.createRange()
        const from = within(doc.element!).getByText('pt11')
        const to = within(doc.element!).getByText('pt122')

        range.setStart(from, 1)
        range.setEnd(to, 1)
        updateRange(range, '$$$', false)
        debugger
        await waitUpdate()
        debugger
        expect(doc.element!.textContent).toBe('sectionp$$$t122pt123pt131pt132pt133')
        console.clear()
        console.log(doc.element!.textContent)
    })

    // TODO 如果是 children 相兼容的情况，要合并 children
    test('update range in different tree level and merge endNode children', async () => {

        const doc = new Doc({
            type: 'Section',
            content: [
                {type: 'Text', value: 'section'} // <-- from here
            ],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.1'}, // <-- to here
                ],
                children: [{
                    type: 'Para',
                    content: [
                        {type: 'Text', value: 'pt111'},
                        {type: 'Text', value: 'pt112'},
                        {type: 'Text', value: 'pt113'}
                    ]
                }]
            }]
        })

        

        const range = document.createRange()
        const from = within(doc.element!).getByText('section')
        const to = within(doc.element!).getByText('section1.1')
        console.log(from, to)

        range.setStart(from, 1)
        range.setEnd(to, 1)
        updateRange(range, '$$$', false)
        await waitUpdate()
        expect(doc.element!.textContent).toBe('s$$$ection1.1pt111pt112pt113')
    })


    // TODO 还有不兼容的情况
})


describe('format range', () => {
    test('format content in single node', async () => {
        const doc = new Doc({
            type: 'Para',
            content: [
                {type: 'Text', value: '11111'},
            ]
        })

        

        const range = document.createRange()
        const container = within(doc.element!).getByText('11111').firstChild! as Node
        range.setStart(container, 1)
        range.setEnd(container, 3)

        doc.formatRange(range, {bold: true})
        await waitUpdate()
        expect(doc.element!.textContent).toBe('11111')
        expect(doc.root.content!.size()).toBe(3)
        expect(doc.root.content!.at(0).value.value).toBe('1')
        expect(doc.root.content!.at(1).value.value).toBe('11')
        expect(doc.root.content!.at(2).value.value).toBe('11')

        // TODO 验证样式
    })

    // TODO 跨越父元素来 format
})


describe('split text as block', () => {
    test('split para', async () => {
        const doc = new Doc({
            type: 'Section',
            content: [
                {type: 'Text', value: 'title'},
            ],
            children: [{
                type: 'Para',
                content: [{
                    type: 'Text', value: 'para1'
                }]
            }]
        })

        
        const range = document.createRange()
        const container = within(doc.element!).getByText('para1').firstChild! as Node
        range.setStart(container, 1)
        range.setEnd(container, 1)
        await doc.splitTextAsBlock(range)

        expect(doc.root.children!.size()).toBe(2)
        expect(doc.root.children!.at(0).content.size()).toBe(1)
        expect(doc.root.children!.at(0).content.at(0).value.value).toBe('p')
        expect(doc.root.children!.at(1).content.size()).toBe(1)
        expect(doc.root.children!.at(1).content.at(0).value.value).toBe('ara1')

    })
})


export {}