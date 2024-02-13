/**
 * @vitest-environment happy-dom
 */
import {DocumentContent, Paragraph, Text} from "../src/DocumentContent.js";
import {DocumentContentView} from "../src/View";
import { state as globalState} from '../src/globals.js'
import {expect, describe, test} from "vitest";
import {Heading} from "../src/components/Heading.js";

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
                children: []
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
})

export {}