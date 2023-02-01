import {waitUpdate} from "../src/buildReactiveView";
import { Doc } from "../src/editing";

describe('basic render', () => {
    test('render Para', () => {
        const doc = new Doc({
            type: 'Para',
            content: [
                {type: 'Text', value: '11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33'}
            ]
        })

        doc.render()

        const docElement = doc.element!
        expect(docElement.textContent).toBe('112233')
    })

    test('render Section', async () => {
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

        doc.render()

        const docElement = doc.element!
        await waitUpdate()
        expect(docElement.textContent).toBe('title112233445566')
    })

    test('render Section in Section', async () => {
        const doc = new Doc({
            type: 'Section',
            content: [{type: 'Text', value: 'title'}],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: '1'},
                    {type: 'Text', value: '2'},
                    {type: 'Text', value: '3'}
                ]
            }, {
                type: 'Section',
                content: [{type: 'Text', value: 'title2'}],
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
            }]
        })

        doc.render()

        const docElement = doc.element!
        await waitUpdate()
        expect(docElement.textContent).toBe('title123title2112233445566')
    })
})

export {}