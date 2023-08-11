import {describe, expect} from "@jest/globals";
import {DocumentContent} from "../src/Document";
import { Section, Paragraph, Text} from "../src/DocNode";


describe('build docNode from raw data', () => {
    test('build Section', () => {
        const data = {
            type: 'Section',
            content: [{type:'Text', value: 'Test Section'}],
            children: []
        }

        const content = new DocumentContent([data], { Section, Paragraph, Text})

        expect(content.firstChild instanceof Section).toBe(true)
        expect((content.firstChild as Section).content!.value).toBe(data.content[0].value)
    })

    test('build Section with Paragraph', () => {
        const data = {
            type: 'Section',
            content: [{type:'Text', value: 'Test Section'}],
            children: [{
                type: 'Paragraph',
                content: []
            }]
        }

        const content = new DocumentContent([data], { Section, Paragraph, Text})
        const section = content.firstChild as Section

        expect(section.firstChild instanceof Paragraph).toBe(true)
        expect(section.firstChild!.firstChild).toBeUndefined()
    })
})
