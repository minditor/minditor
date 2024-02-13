/**
 * @vitest-environment jsdom
 */
import {DocumentContent, Paragraph, Text, DocumentContentView, Heading, OLItem} from "../src/index.js";
import { state as globalState} from '../src/globals.js'
import {expect, describe, test} from "vitest";

describe('basic render', () => {
    test('render Paragraph', () => {
        const doc =  DocumentContent.fromData(
            [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }],
            {Paragraph, Text}
        )

        const docElement = (new DocumentContentView(doc, globalState)).render()
        expect(docElement.textContent).toBe('112233')
    })

    test('render Section', async () => {
        const doc = DocumentContent.fromData(
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
            }], { Heading, Paragraph, Text}
        )

        const docElement = (new DocumentContentView(doc, globalState)).render()

        expect(docElement.textContent).toBe('title112233445566')
    })

    test('render Section in Section', async () => {
        const doc =  DocumentContent.fromData(
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
            }], { Heading, Paragraph, Text})

        const docElement = (new DocumentContentView(doc, globalState)).render()
        expect(docElement.textContent).toBe('title123title2112233445566')
    })

    test('render Section with index', async () => {
        const doc = DocumentContent.fromData(
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
            }], { Heading, Paragraph, Text}
        )

        const docElement = (new DocumentContentView(doc, globalState)).render()

        expect(docElement.textContent).toBe('1title1122331.1title2445566')
    })

    test('render OLItem', async () => {
        const doc = DocumentContent.fromData(
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
            }], { OLItem, Paragraph, Text}
        )

        const docElement = (new DocumentContentView(doc, globalState)).render()

        expect(docElement.textContent).toBe('1.1231.1.4561.1.1.7892.abc')
    })
})

export {}