/**
 * @vitest-environment jsdom
 */
import {Document, Heading, OLItem, Paragraph, Text} from "../src/index.js";
import {describe, expect, test} from "vitest";

describe('basic render', () => {
    test('render Paragraph', () => {
        const doc =  new Document(document.body,{
            name: 'doc',
            children:
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }]},
            {Paragraph, Text}
        )
        doc.render()

        expect(doc.element!.textContent).toBe('112233')
    })

    test('render Section', async () => {
        const doc = new Document(document.body,{
            name: 'doc',
            children:
            [{
                type: 'Heading',
                content: [{type: 'Text', value: 'title'}],
            },{
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
            }]}, { Heading, Paragraph, Text}
        )
        doc.render()

        expect(doc.element!.textContent).toBe('title112233445566')
    })

    test('render Section in Section', async () => {
        const doc =  new Document(document.body,{
            name: 'doc',
            children:
            [{
                type: 'Heading',
                content: [{type: 'Text', value: 'title'}],
            },{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '1'},
                    {type: 'Text', value: '2'},
                    {type: 'Text', value: '3'}
                ]
            }, {
                type: 'Heading',
                content: [{type: 'Text', value: 'title2'}],
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
            }]}, { Heading, Paragraph, Text})

        doc.render()
        expect(doc.element!.textContent!).toBe('title123title2112233445566')
    })

    test('render Section with index', async () => {
        const doc = new Document(document.body,{
            name: 'doc',
            children:
            [{
                type: 'Heading',
                useIndex: true,
                level: 0,
                content: [{type: 'Text', value: 'title'}],
            },{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }, {
                type: 'Heading',
                useIndex: true,
                level: 1,
                content: [{type: 'Text', value: 'title2'}],
            },{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '44'},
                    {type: 'Text', value: '55'},
                    {type: 'Text', value: '66'}
                ]
            }]}, { Heading, Paragraph, Text}
        )
        doc.render()

        expect(doc.element!.textContent).toBe('1title1122331.1title2445566')
    })

    test('render OLItem', async () => {
        const doc = new Document(document.body,{
            name: 'doc',
            children:
            [{
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '1'},
                    {type: 'Text', value: '2'},
                    {type: 'Text', value: '3'}
                ],
                level: 0
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '4'},
                    {type: 'Text', value: '5'},
                    {type: 'Text', value: '6'}
                ],
                level: 1
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: '7'},
                    {type: 'Text', value: '8'},
                    {type: 'Text', value: '9'}
                ],
                level: 2
            }, {
                type: 'OLItem',
                content: [
                    {type: 'Text', value: 'a'},
                    {type: 'Text', value: 'b'},
                    {type: 'Text', value: 'c'}
                ],
                level: 0
            }]}, { OLItem, Paragraph, Text}
        )
        doc.render()

        expect(doc.element!.textContent).toBe('1.1231.1.4561.1.1.7892.abc')
    })
})

export {}