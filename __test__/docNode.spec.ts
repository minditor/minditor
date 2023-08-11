import {describe, expect} from "@jest/globals";
import {DocumentContent} from "../src/Document";
import { docNodeTypes } from "../src/docNodeTypes";

describe('build docNode from raw data', () => {
    test('build Section', () => {

        const data = {
            type: 'Section',
            title: 'Test Section',
            children: []
        }

        const content = new DocumentContent([data], docNodeTypes)

        expect(content.firstChild).toBeUndefined()

    })
})
