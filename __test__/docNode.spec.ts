import {describe, expect} from "@jest/globals";
import {DocumentContent} from "../src/DocumentContent.js";
import { Section, Paragraph, Text} from "../src/DocNode";


describe('build docNode from raw data', () => {
    test('build Section', () => {
        const data = {
            type: 'Document',
            children: [{
                type: 'Section',
                content: [{type:'Text', value: 'Test Section'}],
                children: []
            }]
        }

        const content = new DocumentContent(data, { Section, Paragraph, Text})

        expect(content.firstChild instanceof Section).toBe(true)
        expect((content.firstChild as Section).content!.value).toBe(data.children[0].content[0].value)
    })

    test('build Section with Paragraph', () => {
        const data = {
            type: 'Document',
            children: [{
                type: 'Section',
                content: [{type:'Text', value: 'Test Section'}],
                children: [{
                    type: 'Paragraph',
                    content: []
                }]
            }]
        }

        const content = new DocumentContent(data, { Section, Paragraph, Text})
        const section = content.firstChild as Section

        expect(section.firstChild instanceof Paragraph).toBe(true)
        expect(section.firstChild!.firstChild).toBeUndefined()
    })
})
