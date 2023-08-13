/**@jsx createElement*/

import {ANY, DocumentContent} from "../src/Content";
import { DocumentContentView } from "../src/View";
import {Document} from "../src/Document";
import {Paragraph, Section, Text} from "../src/DocNode";
import { createRoot, createElement } from 'axii'
import { atom } from 'rata'
import { plugins } from "../src/plugins/markdown";

// CAUTION 只能这样写是因为 data 在当前目录之外，用了 alias。但 alias 不能支持动态 import。
const data = {
    // @ts-ignore @vite-ignore
    singlePara: (await import('@tests/data/singlePara')).data,
    singleSection: (await import('@tests/data/singleSection')).data,
    // @ts-ignore
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
    data.singleSection,
    {Paragraph, Section, Text},
    plugins
)

document.getElementById('root')!.appendChild(doc.render())
const root = createRoot(document.getElementById('data')!)

doc.content.listen(ANY, () => {
    changeTimestamp(Date.now())
})

const changeTimestamp = atom('')
root.render(() => <pre>
{() => {
    console.log(changeTimestamp())
    return JSON.stringify(doc.content.toArrayJSON(), null, 4)
}}
</pre>)

window.doc = doc
