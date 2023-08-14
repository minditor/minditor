import {DocumentContent} from "../src/Content";
import {DocumentContentView} from "../src/View";
import {Paragraph, Section, Text} from "../src/DocNode";
import {getByText} from '@testing-library/dom'
import {expect, describe, test} from "@jest/globals";

const BuiltinTypes = {Paragraph, Section, Text}

function getByTestID(element: HTMLElement, id: string) {
    return element.querySelector(`[data-testid='${id}']`)
}

const ZWSP = '​'

describe('insert', () => {
    test('insert content node to para', async () => {
        const doc = new DocumentContent({
            type: 'Document',
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }]
        }, BuiltinTypes)
        const view = (new DocumentContentView(doc)).render()

        doc.insertContentAfter(new Text({type:'Text', value:'44'}), doc.firstChild!.content!.next!)
        
        expect(view.textContent).toBe('11224433')
        doc.insertContentAfter(new Text({type:'Text', value:'555'}), doc.firstChild!.content!.next!.next!)
        
        expect(view.textContent).toBe('11224455533')
    })

    test('insert content node to Para in Section', async () => {
        const doc = new DocumentContent({
            type: 'Document',
            children:[{
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
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(doc).render()

        expect(view.textContent).toBe('title112233445566')
        doc.insertContentAfter(new Text({type:'Text', value:'99'}), doc.firstChild!.firstChild!.content!.next!)

        expect(view.textContent).toBe('title11229933445566')
    })
})

describe('update range', () => {
    test('update range in same content', async () => {
        const doc = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11', testid:'11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33', testid:'33'}
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(doc)
        const element = view.render()

        const range = document.createRange()
        // range.setStart(getByText(element, '11'), 1)
        // range.setEnd(getByText(element!, '33'), 1)
        // FIXME @testing-library/dom 失效
        range.setStart(element.querySelector("[data-testid='11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='33']")!, 1)

        view.updateRange(range, '$$$')
        const newData = doc.toArrayJSON()
        expect(newData.length).toBe(1)
        expect(newData[0].content.length).toBe(2)
        expect(newData[0].content[0].value).toBe('1$$$')
        expect(newData[0].content[1].value).toBe('3')
        expect(element.textContent).toBe('1$$$3')
    })

    test('update range in sibling node content', async () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
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
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()
        const range = document.createRange()
        range.setStart(element.querySelector("[data-testid='pt11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='pt32']")!, 1)

        view.updateRange(range, '$$$')
        expect(element.textContent).toBe('sectionp$$$t32pt33')
    })

    test('update range in different tree level', async () => {

        const content = new DocumentContent({
            type: 'Document',
            children:[{
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
            }]
        }, BuiltinTypes)

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

        const content = new DocumentContent({
            type: 'Document',
            children:[{
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
            }]
        }, BuiltinTypes)

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

describe('delete at content head', () => {
    test('delete at section content head', () => {
        const content = new DocumentContent({
            type: 'Document',
            children: [{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section', testid: 'section'} // <-- from here
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt11'},
                        {type: 'Text', value: 'pt12'},
                        {type: 'Text', value: 'pt13'}
                    ]
                }]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.deleteContent(undefined, range)
        const newData = content.toArrayJSON()

        debugger
        expect(newData).toMatchObject([
            {
                type: 'Paragraph',
                content: [{ type: 'Text', value: 'section'}]
            },
            {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }
        ])

        // 内容不变
        expect(element.textContent).toBe('sectionpt11pt12pt13')
    })

    test('delete in head with previous sibling in tree', () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section', testid:'section'}
                ],
                children: [{
                    type: 'Section',
                    content: [
                        {type: 'Text', value: 'section1.1', testid:'section1.1'}
                    ],
                    children: [{
                        type: 'Paragraph',
                        content: [
                            {type: 'Text', value: 'pt11'},
                            {type: 'Text', value: 'pt12'},
                            {type: 'Text', value: 'pt13'}
                        ]
                    }]
                }]
            }, {
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.2', testid:'section1.2'} // <-- here
                ],
                children: [{
                    type: 'Section',
                    content: [
                        {type: 'Text', value: 'section1.2.1', testid:'section1.2.1'}
                    ],
                    children: []
                }]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section1.2')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.deleteContent(undefined, range)
        const newData = content.toArrayJSON()
        debugger
        expect(newData).toMatchObject([{
            type: 'Section',
            content: [
                {type: 'Text', value: 'section', }
            ],
            children: [{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.1', }
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt11'},
                        {type: 'Text', value: 'pt12'},
                        {type: 'Text', value: 'pt13'},
                    ]
                }, {
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'section1.2',}
                    ]
                }, {
                    type: 'Section',
                    content: [
                        {type: 'Text', value: 'section1.2.1'}
                    ],
                    children: []
                }]
            }]
        }])

        // 内容不变
        expect(element.textContent).toBe('sectionsection1.1pt11pt12pt13section1.2section1.2.1')
    })

    test('delete at para head, should merge into previous para content', () => {
        const content = new DocumentContent({
            type: 'Document',
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt21', testid: 'pt21'}, // <-- here
                    {type: 'Text', value: 'pt22'},
                    {type: 'Text', value: 'pt23'}
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt21')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.deleteContent(undefined, range)
        const newData = content.toArrayJSON()
        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11'},
                {type: 'Text', value: 'pt12'},
                {type: 'Text', value: 'pt13'},
                {type: 'Text', value: 'pt21'},
                {type: 'Text', value: 'pt22'},
                {type: 'Text', value: 'pt23'}
            ]
        }])
        expect(element.textContent).toBe('pt11pt12pt13pt21pt22pt23')
    })
})

describe('change line', () => {
    test('change line at para head', () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid:'pt11'}, // <-- here
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt11')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.changeLine(undefined, range)
        const newData = content.toArrayJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [{type: 'Text', value:''}]
        },{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11'},
                {type: 'Text', value: 'pt12'},
                {type: 'Text', value: 'pt13'},
            ]
        }])
        // CAUTION 这里判断的 ZWSP 非常重要，不然空行是没法  focus 到 span 里面去的。
        expect(element.textContent).toBe(`${ZWSP}pt11pt12pt13`)
    })

    test('change line at middle of para', () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', },
                    {type: 'Text', value: 'pt12', testid:'pt12'}, // <-- here
                    {type: 'Text', value: 'pt13'}
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt12')!
        range.setStart(from, 1)
        range.setEnd(from, 1)

        view.changeLine(undefined, range)
        const newData = content.toArrayJSON()
        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value:'pt11'},
                {type: 'Text', value:'p'},
            ]
        },{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 't12'},
                {type: 'Text', value: 'pt13'},
            ]
        }])
        expect(element.textContent).toBe('pt11pt12pt13')
    })

    test('change line at middle of section', () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Section',
                content: [
                    {type: 'Text', value: 's11', },
                    {type: 'Text', value: 's12', testid:'s12'}, // <-- here
                    {type: 'Text', value: 's13'}
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt21', }
                    ]
                }]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 's12')!
        range.setStart(from, 1)
        range.setEnd(from, 1)

        view.changeLine(undefined, range)
        const newData = content.toArrayJSON()

        expect(newData).toMatchObject([{
            type: 'Section',
            content: [
                {type: 'Text', value:'s11'},
                {type: 'Text', value:'s'},
            ],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '12'},
                    {type: 'Text', value: 's13'},
                ]
            },{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt21'},
                ]
            }]
        }])
        expect(element.textContent).toBe('s11s12s13pt21')
    })

    test('change line at end of para', () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', },
                    {type: 'Text', value: 'pt12',},
                    {type: 'Text', value: 'pt13',  testid:'pt13'}// <-- here
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt13')!
        // CAUTION 如果要选中文字的最后，一定要用 firstChild 得到那个 Text 节点才行，不然就会报 out of bound。严格来说上面都应该改成这样。
        //  只不过刚好 span 里只有一个节点，所以能兼容。
        range.setStart(from.firstChild!, 4)
        range.setEnd(from.firstChild!, 4)

        view.changeLine(undefined, range)
        const newData = content.toArrayJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value:'pt11'},
                {type: 'Text', value: 'pt12'},
                {type: 'Text', value: 'pt13'},
            ]
        },{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: ''},
            ]
        }])
        expect(element.textContent).toBe(`pt11pt12pt13${ZWSP}`)
    })

})

//
//
describe('format range', () => {
    test('format content in single node', async () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid:'pt11'},// <-- here
                    {type: 'Text', value: 'pt12',},
                    {type: 'Text', value: 'pt13',  testid:'pt13'}// <-- here
                ]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt11')!
        const to = getByTestID(element, 'pt13')!

        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.formatRange(range, {bold: true})

        const newData = content.toArrayJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt'},
                {type: 'Text', value: '11', props: { formats: {bold: true} }},
                {type: 'Text', value: 'pt12', props: { formats: {bold: true} }},
                {type: 'Text', value: 'pt', props: { formats: {bold: true} }},
                {type: 'Text', value: '13'}
            ]
        }])
    })


    test('format content across sections', async () => {
        const content = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section', testid:'section'} // <-- here
                ],
                children: [{
                    type: 'Section',
                    content: [
                        {type: 'Text', value: 'section1.1', testid:'section1.1'}
                    ],
                    children: [{
                        type: 'Paragraph',
                        content: [
                            {type: 'Text', value: 'pt11'},
                            {type: 'Text', value: 'pt12'},
                            {type: 'Text', value: 'pt13'}
                        ]
                    }]
                }]
            }, {
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.2', testid:'section1.2'} // <-- here
                ],
                children: [{
                    type: 'Section',
                    content: [
                        {type: 'Text', value: 'section1.2.1', testid:'section1.2.1'}
                    ],
                    children: []
                }]
            }]
        }, BuiltinTypes)

        const view = new DocumentContentView(content)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        const to = getByTestID(element, 'section1.2')!

        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.formatRange(range, {bold: true})

        const newData = content.toArrayJSON()

        expect(newData).toMatchObject([{
            type: 'Section',
            content: [
                {type: 'Text', value: 'se'}, // <-- here
                {type: 'Text', value: 'ction', props: { formats: {bold: true}}}
            ],
            children: [{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.1', props: { formats: {bold: true}}}
                ],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt11', props: { formats: {bold: true}}},
                        {type: 'Text', value: 'pt12', props: { formats: {bold: true}}},
                        {type: 'Text', value: 'pt13', props: { formats: {bold: true}}}
                    ]
                }]
            }]
        }, {
            type: 'Section',
            content: [
                {type: 'Text', value: 'se', props: { formats: {bold: true}}},
                {type: 'Text', value: 'ction1.2'} // <-- here
            ],
            children: [{
                type: 'Section',
                content: [
                    {type: 'Text', value: 'section1.2.1'}
                ],
                children: []
            }]
        }])
    })
})


export {}