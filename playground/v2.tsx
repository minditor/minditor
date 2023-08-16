/**@jsx createElement*/

import {ANY, DocumentContent} from "../src/Content";
import { DocumentContentView } from "../src/View";
import {Document} from "../src/Document";
import {Paragraph, Section, Text, ListItem} from "../src/DocNode";
import { createRoot, createElement } from 'axii'
import { atom } from 'rata'
import { plugins as markdownPlugins } from "../src/plugins/markdown";
import { createRangeTool, defaultFormatWidgets } from '../src/plugins/RangeTool'
import { createSuggestionTool, defaultBlockSuggestionWidgets } from '../src/plugins/SuggestionTool'
import {nextTask} from "../src/util";

// CAUTION 只能这样写是因为 data 在当前目录之外，用了 alias。但 alias 不能支持动态 import。
const data = {
    // @ts-ignore @vite-ignore
    singlePara: (await import('@tests/data/singlePara')).data,
    singleSection: (await import('@tests/data/singleSection')).data,
    // @ts-ignore
    singleList: (await import('@tests/data/singleList')).data,
    nestedList: (await import('@tests/data/nestedList')).data,
    multiSection: (await import('@tests/data/multiSection')).data,
}

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)
// @ts-ignore @vite-ignore
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`../../tests/server/data/${'singlePara'}`)

const doc = new Document(
    // data.singlePara,
    // data.multiSection,
    // data.singleSection,
    // data.singleList,
    data.nestedList,
    {Paragraph, Section, Text, ListItem},
    [
        ...markdownPlugins,
        createRangeTool(defaultFormatWidgets),
        createSuggestionTool('/', true, defaultBlockSuggestionWidgets)
    ]
)

document.getElementById('root')!.appendChild(doc.render())
document.getElementById('root')!.appendChild(doc.renderPluginViews())

// state preview
const stateRoot = createRoot(document.getElementById('state')!)
stateRoot.render(() => <div>
    <div>
        <span>mouse position:</span>
        <span>{() => JSON.stringify(doc.view.state.mousePosition())}</span>
    </div>
    <div>
        <span>selection range rect:</span>
        <span>{() => JSON.stringify(doc.view.state.visibleRangeRect())}</span>
    </div>
    <div>
        <span>last active device:</span>
        <span>{() => JSON.stringify(doc.view.state.lastActiveDevice())}</span>
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
