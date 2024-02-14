/**
 * @vitest-environment jsdom
 */
import {DocumentContent, Paragraph, Heading, Text, ULItem, DocumentContentView, OLItem} from "../src/index.js";
import {state as globalStates} from '../src/globals.js'
import {getByText} from '@testing-library/dom'
import {expect, describe, test} from "vitest";

const BuiltinTypes = {Paragraph, Heading, Text, ULItem, OLItem}

function getByTestID(element: HTMLElement, id: string) {
    return element.querySelector(`[data-testid='${id}']`)
}

const ZWSP = '​'

describe('insert', () => {
    test('insert content node to para', async () => {
        const doc = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }]
            , BuiltinTypes)
        const view = (new DocumentContentView(doc, globalStates)).render()

        doc.append(new Text({type: 'Text', value: '44'}), doc.firstChild!.firstChild!.next!, doc.firstChild!)

        expect(view.textContent).toBe('11224433')
        doc.append(new Text({type: 'Text', value: '555'}), doc.firstChild!.firstChild!.next!.next!, doc.firstChild!)

        expect(view.textContent).toBe('11224455533')
    })

    test('insert content node to Para in Section', async () => {
        const doc = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [{type: 'Text', value: 'title'}],

            }, {
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
            , BuiltinTypes)

        const view = new DocumentContentView(doc, globalStates).render()

        expect(view.textContent).toBe('title112233445566')
        doc.append(new Text({type: 'Text', value: '99'}), doc.firstChild!.next!.firstChild!.next!, doc.firstChild!.next!)

        expect(view.textContent).toBe('title11229933445566')
    })
})

describe('update range', () => {
    test('update range in same content', async () => {
        const doc = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11', testid: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33', testid: '33'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(doc, globalStates)
        const element = view.render()

        const range = document.createRange()
        // range.setStart(getByText(element, '11'), 1)
        // range.setEnd(getByText(element!, '33'), 1)
        range.setStart(element.querySelector("[data-testid='11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='33']")!, 1)

        view.updateRange(view.createDocRange(range)!, '$$$')
        const newData = doc.toJSON()
        expect(newData.length).toBe(1)
        expect(newData[0].content.length).toBe(2)
        expect(newData[0].content[0].value).toBe('1$$$')
        expect(newData[0].content[1].value).toBe('3')
        expect(element.textContent).toBe('1$$$3')
    })

    test('update range in sibling node content', async () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section'}
                ],

            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid: 'pt11'}, //<--start
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
                    {type: 'Text', value: 'pt32', testid: 'pt32'},//<--end
                    {type: 'Text', value: 'pt33'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()
        const range = document.createRange()
        range.setStart(element.querySelector("[data-testid='pt11']")!, 1)
        range.setEnd(element.querySelector("[data-testid='pt32']")!, 1)

        view.updateRange(view.createDocRange(range)!, '$$$')
        expect(element.textContent).toBe('sectionp$$$t32pt33')
    })

    test('update range in different tree level', async () => {

        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section'}
                ],
            }, {
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
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.1'},
                ],

            }, {
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
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt131'},
                    {type: 'Text', value: 'pt132'},
                    {type: 'Text', value: 'pt133'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = element.querySelector("[data-testid='pt11']")!
        const to = element.querySelector("[data-testid='pt122']")!

        range.setStart(from, 1)
        range.setEnd(to, 1)
        view.updateRange(view.createDocRange(range)!, '$$$')
        debugger

        debugger
        expect(element.textContent).toBe('sectionp$$$t122pt123pt131pt132pt133')
        console.clear()
        console.log(element.textContent)
    })

    // TODO 如果是 children 相兼容的情况，要合并 children
    test('update range in different tree level and merge endNode children', async () => {

        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section', testid: 'section'} // <-- from here
                ],
            },
                {
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: 'pt11'},
                        {type: 'Text', value: 'pt12'},
                        {type: 'Text', value: 'pt13'}
                    ]
                }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.1', testid: 'section1.1'}, // <-- to here
                ],

            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt111'},
                    {type: 'Text', value: 'pt112'},
                    {type: 'Text', value: 'pt113'}
                ]
            }]
            ,
            BuiltinTypes
        )

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        const to = getByTestID(element, 'section1.1')!
        console.log(from, to)

        range.setStart(from, 1)
        range.setEnd(to, 1)
        view.updateRange(view.createDocRange(range)!, '$$$')

        expect(element.textContent).toBe('s$$$ection1.1pt111pt112pt113')
    })
    //
    // TODO 还有不兼容的情况
})

describe('delete at content head', () => {
    test('delete at section content head', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section', testid: 'section'} // <-- from here
                ],
            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.state.selectionRange(view.createDocRange(range)!)
        view.deleteLast(new KeyboardEvent('keydown', {key: 'Backspace'}))
        const newData = content.toJSON()

        expect(newData).toMatchObject([
            {
                type: 'Paragraph',
                content: [{type: 'Text', value: 'section'}]
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

    test('delete at head with previous sibling in tree', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section', testid: 'section'}
                ],

            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.1', testid: 'section1.1'}
                ],

            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.2', testid: 'section1.2'} // <-- here
                ],

            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.2.1', testid: 'section1.2.1'}
                ],
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section1.2')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.state.selectionRange(view.createDocRange(range)!)
        view.deleteLast(new KeyboardEvent('keydown', {key: 'Backspace'}))
        const newData = content.toJSON()
        expect(newData).toMatchObject([{
            type: 'Heading',
            content: [
                {type: 'Text', value: 'section',"testid": "section",}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }, {
            type: 'Heading',
            content: [
                {type: 'Text', value: 'section1.1',"testid": "section1.1",}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11'},
                {type: 'Text', value: 'pt12'},
                {type: 'Text', value: 'pt13'},
            ]
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'section1.2',"testid": "section1.2",}
            ]
        }, {
            type: 'Heading',
            content: [
                {type: 'Text', value: 'section1.2.1', "testid": "section1.2.1",}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }])

        // 内容不变
        expect(element.textContent).toBe('sectionsection1.1pt11pt12pt13section1.2section1.2.1')
    })

    test('delete at para head, should merge into previous para content', () => {
        const content = DocumentContent.fromData(
            [{
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
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt21')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.state.selectionRange(view.createDocRange(range)!)
        view.deleteLast(new KeyboardEvent('keydown', {key: 'Backspace'}))

        const newData = content.toJSON()
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


    test('delete at list head, should unwrap as new para', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'OLItem',
                level:0,
                content: [
                    {type: 'Text', value: 'l11'},
                    {type: 'Text', value: 'l12'},
                    {type: 'Text', value: 'l13'}
                ],
            }, {
                type: 'OLItem',
                level:1,
                content: [
                    {type: 'Text', value: 'l111'},
                    {type: 'Text', value: 'l112'},
                    {type: 'Text', value: 'l113'}
                ]
            }, {
                type: 'OLItem',
                level:0,
                content: [
                    {type: 'Text', value: 'l21'},
                    {type: 'Text', value: 'l22'},
                    {type: 'Text', value: 'l23'}
                ],

            }, {
                type: 'OLItem',
                level:0,
                content: [
                    {type: 'Text', value: 'l213', testid: 'l213'}, // <-- here
                    {type: 'Text', value: 'l212'},
                    {type: 'Text', value: 'l213'}
                ]
            }, {
                type: 'OLItem',
                level:0,
                content: [
                    {type: 'Text', value: 'l31'},
                    {type: 'Text', value: 'l32'},
                    {type: 'Text', value: 'l33'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'l213')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.state.selectionRange(view.createDocRange(range)!)
        view.deleteLast(new KeyboardEvent('keydown', {key: 'Backspace'}))
        const newData = content.toJSON()
        expect(newData).toMatchObject([{
            type: 'OLItem',
            level:0,
            content: [
                {type: 'Text', value: 'l11'},
                {type: 'Text', value: 'l12'},
                {type: 'Text', value: 'l13'}
            ],
            "manualIndex": undefined,
        }, {
            type: 'OLItem',
            level:1,
            content: [
                {type: 'Text', value: 'l111'},
                {type: 'Text', value: 'l112'},
                {type: 'Text', value: 'l113'}
            ],
            "manualIndex": undefined,
        }, {
            type: 'OLItem',
            level:0,
            content: [
                {type: 'Text', value: 'l21'},
                {type: 'Text', value: 'l22'},
                {type: 'Text', value: 'l23'}
            ],
            "manualIndex": undefined,
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'l213', "testid": "l213",}, // <-- here
                {type: 'Text', value: 'l212'},
                {type: 'Text', value: 'l213'}
            ],
        }, {
            type: 'OLItem',
            level:0,
            content: [
                {type: 'Text', value: 'l31'},
                {type: 'Text', value: 'l32'},
                {type: 'Text', value: 'l33'}
            ],
            "manualIndex": undefined,
        }])
        //
        expect(element.textContent).toBe('1.l11l12l131.1.l111l112l1132.l21l22l23l213l212l2131.l31l32l33')
    })
})

describe('change line', () => {
    test('change line at para head', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid: 'pt11'}, // <-- here
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt11')!
        range.setStart(from, 0)
        range.setEnd(from, 0)

        view.state.selectionRange(view.createDocRange(range)!)
        view.splitContent(new KeyboardEvent('keydown', {key: 'Enter'}))
        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [{type: 'Text', value: ''}]
        }, {
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
        const content = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11',},
                    {type: 'Text', value: 'pt12', testid: 'pt12'}, // <-- here
                    {type: 'Text', value: 'pt13'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt12')!
        range.setStart(from, 1)
        range.setEnd(from, 1)

        view.state.selectionRange(view.createDocRange(range)!)
        view.splitContent(new KeyboardEvent('keydown', {key: 'Enter'}))
        const newData = content.toJSON()
        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11'},
                {type: 'Text', value: 'p'},
            ]
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 't12'},
                {type: 'Text', value: 'pt13'},
            ]
        }])
        expect(element.textContent).toBe('pt11pt12pt13')
    })

    test('change line at middle of section', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 's11',},
                    {type: 'Text', value: 's12', testid: 's12'}, // <-- here
                    {type: 'Text', value: 's13'}
                ],

            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt21',}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 's12')!
        range.setStart(from, 1)
        range.setEnd(from, 1)

        view.state.selectionRange(view.createDocRange(range)!)
        view.splitContent(new KeyboardEvent('keydown', {key: 'Enter'}))
        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'Heading',
            content: [
                {type: 'Text', value: 's11'},
                {type: 'Text', value: 's'},
            ],

        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: '12'},
                {type: 'Text', value: 's13'},
            ]
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt21'},
            ]
        }])
        expect(element.textContent).toBe('s11s12s13pt21')
    })

    test('change line at end of para', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11',},
                    {type: 'Text', value: 'pt12',},
                    {type: 'Text', value: 'pt13', testid: 'pt13'}// <-- here
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt13')!
        // CAUTION 如果要选中文字的最后，一定要用 firstChild 得到那个 Text 节点才行，不然就会报 out of bound。严格来说上面都应该改成这样。
        //  只不过刚好 span 里只有一个节点，所以能兼容。
        range.setStart(from.firstChild!, 4)
        range.setEnd(from.firstChild!, 4)

        view.state.selectionRange(view.createDocRange(range)!)
        view.splitContent(new KeyboardEvent('keydown', {key: 'Enter'}))
        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11'},
                {type: 'Text', value: 'pt12'},
                {type: 'Text', value: 'pt13'},
            ]
        }, {
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
        const content = DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11', testid: 'pt11'},// <-- here
                    {type: 'Text', value: 'pt12',},
                    {type: 'Text', value: 'pt13', testid: 'pt13'}// <-- here
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'pt11')!
        const to = getByTestID(element, 'pt13')!

        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.formatRange(view.createDocRange(range)!,{bold: true})

        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt'},
                {type: 'Text', value: '11', formats: {bold: true}},
                {type: 'Text', value: 'pt12', formats: {bold: true}},
                {type: 'Text', value: 'pt', formats: {bold: true}},
                {type: 'Text', value: '13'}
            ]
        }])
    })


    test('format content across sections', async () => {
        const content = DocumentContent.fromData(
            [{
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section', testid: 'section'} // <-- here
                ],

            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.1', testid: 'section1.1'}
                ],

            }, {
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 'pt11'},
                    {type: 'Text', value: 'pt12'},
                    {type: 'Text', value: 'pt13'}
                ]
            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.2', testid: 'section1.2'} // <-- here
                ],

            }, {
                type: 'Heading',
                content: [
                    {type: 'Text', value: 'section1.2.1', testid: 'section1.2.1'}
                ],
                children: []
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'section')!
        const to = getByTestID(element, 'section1.2')!

        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.formatRange(view.createDocRange(range)!, {bold: true})

        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'Heading',
            content: [
                {type: 'Text', value: 'se', "testid": "section",}, // <-- here
                {type: 'Text', value: 'ction', formats: {bold: true}}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }, {
            type: 'Heading',
            content: [
                {type: 'Text', value: 'section1.1', formats: {bold: true}, "testid": "section1.1",}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'pt11', formats: {bold: true}},
                {type: 'Text', value: 'pt12', formats: {bold: true}},
                {type: 'Text', value: 'pt13', formats: {bold: true}}
            ]
        }, {
            type: 'Heading',
            content: [
                {type: 'Text', value: 'se', formats: {bold: true}, "testid": "section1.2",},
                {type: 'Text', value: 'ction1.2'} // <-- here
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }, {
            type: 'Heading',
            content: [
                {type: 'Text', value: 'section1.2.1', "testid": "section1.2.1",}
            ],
            "level": 0,
            "manualIndex": undefined,
            "useIndex": false,
        }])
    })
})


describe('list update', () => {
    test('change line at end of para', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'OLItem',
                content: [
                    {type: 'Text', value: 'l1pt11'},
                    {type: 'Text', value: 'l1pt12', testid: 'l1pt12'}, // <-- here
                    {type: 'Text', value: 'l1pt13'}
                ]
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: 'l2pt11',},
                    {type: 'Text', value: 'l2pt12', testid: 'l2pt12'},// <-- here
                    {type: 'Text', value: 'l2pt13',}
                ]
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: 'l3pt11'},
                    {type: 'Text', value: 'l3pt12'},
                    {type: 'Text', value: 'l3pt13'}
                ]
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, 'l1pt12')!
        const to = getByTestID(element, 'l2pt12')!
        // CAUTION 如果要选中文字的最后，一定要用 firstChild 得到那个 Text 节点才行，不然就会报 out of bound。严格来说上面都应该改成这样。
        //  只不过刚好 span 里只有一个节点，所以能兼容。
        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.updateRange(view.createDocRange(range)!, '')
        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'OLItem',
            content: [
                {type: 'Text', value: 'l1pt11'},
                {type: 'Text', value: 'l1'}, // <-- here
                {type: 'Text', value: 'pt12'},// <-- here
                {type: 'Text', value: 'l2pt13',}
            ],
            level:0
        }, {
            type: 'OLItem',
            content: [
                {type: 'Text', value: 'l3pt11'},
                {type: 'Text', value: 'l3pt12'},
                {type: 'Text', value: 'l3pt13'}
            ],
            level:0
        }])

        expect(element.textContent).toBe(`1.l1pt11l1pt12l2pt132.l3pt11l3pt12l3pt13`)
    })


    test('update range in nested list', () => {
        const content = DocumentContent.fromData(
            [{
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '222'},
                ],
                level:0
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '333'},
                ],
                level:1
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '666'},
                ],
                level:2
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '777'},
                    {type: 'Text', value: '777', testid: '777'}, // <-- from
                    {type: 'Text', value: '777'}
                ],
                level:3
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: 'list2', testid: 'list2'}, // <-- to
                ],
                level:2
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '9'},
                    {type: 'Text', value: '99'},
                    {type: 'Text', value: '999'}
                ],
                level:1
            }]
            , BuiltinTypes)

        const view = new DocumentContentView(content, globalStates)
        const element = view.render()

        const range = document.createRange()
        const from = getByTestID(element, '777')!
        const to = getByTestID(element, 'list2')!

        range.setStart(from.firstChild!, 2)
        range.setEnd(to.firstChild!, 2)

        view.updateRange(view.createDocRange(range)!, '')
        const newData = content.toJSON()

        expect(newData).toMatchObject([{
            type: 'OLItem',
            content: [
                {type: 'Text', value: '222'},
            ],
            level:0
        }, {
            type: 'OLItem',
            content: [
                {type: 'Text', value: '333'},
            ],
            level:1
        }, {
            type: 'OLItem',
            content: [
                {type: 'Text', value: '666'},
            ],
            level:2
        }, {
            type: 'OLItem',
            content: [
                {type: 'Text', value: '777'},
                {type: 'Text', value: '77'},
                {type: 'Text', value: 'st2'},
            ],
            level:3
        }, {
            type: 'OLItem',
            content: [
                {type: 'Text', value: '9'},
                {type: 'Text', value: '99'},
                {type: 'Text', value: '999'}
            ],
            level:1
        }])

        expect(element.textContent).toBe(`1.2221.1.3331.1.1.6661.1.1.1.77777st21.2.999999`)
    })


})


export {}