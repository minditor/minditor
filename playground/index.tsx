/**@jsx createElement*/

import { registerCommands as markdownPlugins } from "../src/markdown";
import { registerCommands as inlineToolCommands } from "../src/inlineTool";
import { Doc } from "../src";
const rootElement = document.getElementById('root')!
rootElement.style.position = 'relative'


// CAUTION 只能这样写是因为 data 在当前目录之外，用了 alias。但 alias 不能支持动态 import。
const data = {
    // @ts-ignore @vite-ignore
    singlePara: (await import('@tests/data/singlePara')).data,
    // @ts-ignore
    nestedList: (await import('@tests/data/nestedList')).data,
}

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)
// @ts-ignore @vite-ignore
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`@tests/data/${searchObj.data || 'singlePara'}`)
// const { data } = await import(`../../tests/server/data/${'singlePara'}`)


const doc = new Doc(
    // @ts-ignore
    data[searchObj.data || 'singlePara'],
    rootElement,
    [...markdownPlugins(), ...inlineToolCommands()]
    // []，

)
doc.render()
// @ts-ignore
window.doc = doc



