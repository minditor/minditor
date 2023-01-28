/**@jsx createElement*/

import { registerCommands as markdownPlugins } from "../src/markdown";
import { registerCommands as inlineToolCommands } from "../src/inlineTool";
import { Doc } from "../src";
// import { data } from './data/singleSection'
// import { data } from './data/multiSection'
import { data } from './data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'
const rootElement = document.getElementById('root')!
rootElement.style.position = 'relative'

const doc = new Doc(
    data,
    rootElement,
    // [...markdownPlugins(), ...inlineToolCommands()]
    []
)
doc.render()
// @ts-ignore
window.doc = doc



