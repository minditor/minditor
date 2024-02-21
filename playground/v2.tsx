/**@jsx createElement*/

import {ANY, DocumentContent} from "../src/DocumentContent.js";
import { DocumentContentView } from "../src/View";
import {Document} from "../src/Document";
import {Paragraph, Section, Text, ListItem} from "../src/DocNode";
import { ImageBlock, ImageSuggestionWidget } from "../src/components/Image.js";
import { Code, CodeSuggestionWidget} from "../src/components/Code";
import { createRoot, createElement } from 'axii'
import { atom } from 'rata'
import { defaultMarkdownPlugins as markdownPlugins } from "../src/plugins/markdown";
import { createRangeTool, defaultFormatWidgets } from '../src/plugins/RangeTool'
import { createSuggestionTool, defaultSuggestionWidgets } from '../src/plugins/SuggestionTool'
import { BlockToolPlugin } from "../src/plugins/BlockToolPlugin.js";

import {nextTask} from "../src/util";

// CAUTION 只能这样写是因为 data 在当前目录之外，用了 alias。但 alias 不能支持动态 import。
const data = {
    // @ts-ignore @vite-ignore
    singlePara: (await import('@tests/data/singlePara')).data,
    multiPara: (await import('@tests/data/multiPara')).data,
    singleSection: (await import('@tests/data/singleSection')).data,
    // @ts-ignore
    singleList: (await import('@tests/data/singleList')).data,
    nestedList: (await import('@tests/data/nestedList')).data,
    multiSection: (await import('@tests/data/multiSection')).data,
    misc: (await import('@tests/data/misc')).data,
}

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)
// @ts-ignore @vite-ignore
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`../../tests/server/data/${'singlePara'}`)

const doc = new Document(document.getElementById('root')!, data.misc, {
    Paragraph,
    Section,
    Text,
    ListItem,
    Image: ImageBlock,
    Code
})

doc.render()

// state preview
const stateRoot = createRoot(document.getElementById('state')!)
stateRoot.render(() => <div>
    <div>
        <span>mouse position:</span>
        <span>{() => JSON.stringify(doc.view.state.mousePosition())}</span>
    </div>
    <div>
        <span>selection range rect:</span>
        <span>{() => JSON.stringify(doc.view.state.invertVisibleRangeRect())}</span>
    </div>
    <div>
        <span>last active device:</span>
        <span>{() => JSON.stringify(doc.view.state.lastActiveDeviceType())}</span>
    </div>
</div>)

// data preview
const dataRoot = createRoot(document.getElementById('data')!)
doc.content.listen(ANY, () => {
    nextTask(() => {
        changeTimestamp(Date.now())
    })
})

const changeTimestamp = atom('')

dataRoot.render(() => <pre>
{() => {
    console.log(changeTimestamp())
    return JSON.stringify(doc.content.toArrayJSON(), null, 4)
}}
</pre>)

window.doc = doc
