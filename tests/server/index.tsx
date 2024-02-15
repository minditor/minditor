/**@jsx createElement*/
import {createElement, expect, expectDeepMatch, expectDOMMatch, expectSelectionMatch} from "./util";
import {screen} from "@testing-library/dom";
import {actions, Document, Heading, InlineCode, OLItem, Paragraph, state, Text, ULItem} from 'minditor'
import '../spec/test-extend.ts'

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)


// import { registerCommands as markdownPlugins } from "../../src/markdown";
// import { registerCommands as inlineToolCommands } from "../../src/inlineTool";
// import { data } from '@test/spec/data/singleSection'
// import { data } from '@test/spec/data/multiSection'
// import { data } from '@test/spec/data/singlePara'
// import { data } from '@test/spec/data/singleList'
// import { data } from '@test/spec/data/component'
// import { data } from '@test/spec/data/nestedList'
// import { data } from '@test/spec/data/multiPara'
// import { data } from '@test/spec/data/playgroundMultiPara'


/* @vite-ignore */
const {data} = await import(`../spec/data/${searchObj.data || 'singlePara'}`)
const rootElement = document.getElementById('root')!
const types = {
    Paragraph, Text, Heading, OLItem, ULItem, InlineCode

}

rootElement.style.position = 'relative'

const doc = new Document(
    rootElement,
    data,
    types,
    []
)


Object.assign(window, {
    get doc() {
        return doc
    },
    page: screen,
    state,
    actions,
    expectDOMMatch,
    expectDeepMatch,
    expectSelectionMatch,
    expect,
    createElement,
})

// 一定要放最后，这个时候才触发 test case
doc.render()




