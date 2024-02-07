import {DocumentContent} from "../src/DocumentContent.js";
import {DocumentContentView} from "../src/View";
import {Paragraph, Section, Text} from "../src/DocNode";
import {expect, describe, test} from "@jest/globals";

describe('basic render', () => {
    test('render Paragraph', () => {
        const doc = new DocumentContent({
            type: 'Document',
            children:[{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }]
        }, { Section, Paragraph, Text})

        const docElement = (new DocumentContentView(doc)).render()
        expect(docElement.textContent).toBe('112233')
    })

    test('render Section', async () => {
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
        }, { Section, Paragraph, Text})

        const docElement = (new DocumentContentView(doc)).render()

        expect(docElement.textContent).toBe('title112233445566')
    })

    test('render Section in Section', async () => {
        const doc = new DocumentContent({
            type: 'Document',
            children: [{
                type: 'Section',
                content: [{type: 'Text', value: 'title'}],
                children: [{
                    type: 'Paragraph',
                    content: [
                        {type: 'Text', value: '1'},
                        {type: 'Text', value: '2'},
                        {type: 'Text', value: '3'}
                    ]
                }, {
                    type: 'Section',
                    content: [{type: 'Text', value: 'title2'}],
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
            }]
        }, { Section, Paragraph, Text})

        const docElement = (new DocumentContentView(doc)).render()
        expect(docElement.textContent).toBe('title123title2112233445566')
    })
})

export {}