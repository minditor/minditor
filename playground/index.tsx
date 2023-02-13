/**@jsx createElement*/

import { registerCommands as markdownPlugins } from "../src/markdown";
import { registerCommands as inlineToolCommands } from "../src/inlineTool";
import { Doc } from "../src";
// import { data } from './data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/singleList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
const rootElement = document.getElementById('root')!
rootElement.style.position = 'relative'

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)
// @ts-ignore @vite-ignore
const { data } = await import(`./data/${searchObj.data || 'singlePara'}`)

const doc = new Doc(
    data,
    rootElement,
    [...markdownPlugins(), ...inlineToolCommands()]
    // []，

)
doc.render()
// @ts-ignore
window.doc = doc



