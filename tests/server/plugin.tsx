/**@jsx createElement*/
import {createElement, expect, expectDeepMatch, expectDOMMatch, expectSelectionMatch} from "./util";
import {screen} from "@testing-library/dom";
import {
    actions,
    Document,
    Heading,
    InlineCode,
    OLItem,
    Paragraph,
    state,
    Text,
    ULItem,
    Code,
    Grid,
    Link,
    scaffold,
    createBlockTool,
    createRangeTool,
    defaultBlockWidgets,
    defaultFormatWidgets,
    createSuggestionTool,
    defaultSuggestionWidgets,
    defaultMarkdownPlugins,
    InlineImageBlock
} from 'minditor'
import '../spec/test-extend.js'

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
    Paragraph,
    Text,
    Heading,
    OLItem,
    ULItem,
    InlineCode,
    Code,
    Link,
    Grid,
    Image: InlineImageBlock
}

const plugins = [
    ...defaultMarkdownPlugins,
    createBlockTool(defaultBlockWidgets),
    createRangeTool( defaultFormatWidgets ),
    createSuggestionTool('/',  defaultSuggestionWidgets)
]
const result = scaffold(rootElement, {data, types, plugins}, )
result.render()


Object.assign(window, {
    get doc() {
        return result.doc
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

