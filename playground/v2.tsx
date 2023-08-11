/**@jsx createElement*/

import {ANY, DocumentContent} from "../src/Document";
import { DocumentContentView } from "../src/View";
import {Paragraph, Section, Text} from "../src/DocNode";
import { createRoot, createElement } from 'axii'
import { atom } from 'rata'

// CAUTION 只能这样写是因为 data 在当前目录之外，用了 alias。但 alias 不能支持动态 import。
const data = {
    // @ts-ignore @vite-ignore
    singlePara: (await import('@tests/data/singlePara')).data,
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

const content = new DocumentContent(
    // data.singlePara.children,
    data.multiSection.children,
    {Paragraph, Section, Text}
)
const newView = new DocumentContentView(content)

document.getElementById('root')!.appendChild(newView.render())
const root = createRoot(document.getElementById('data')!)

content.listen(ANY, () => {
    changeTimestamp(Date.now())
})

const changeTimestamp = atom('')
root.render(() => <pre>
{() => {
    console.log(changeTimestamp())
    return JSON.stringify(content.toJSON(), null, 4)
}}
</pre>)


