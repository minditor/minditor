/**@jsx createElement*/
import {createElement, deepMatch, partialMatch, expect} from "./util";
import {screen} from "@testing-library/dom";
import { state, actions } from '../../src/globals'
import '../test-extend.ts'

const searchObj = Object.fromEntries(
    window.location.search.slice(1).split('&').map(pair => pair.split('='))
)


import { registerCommands as markdownPlugins } from "../../src/markdown";
import { registerCommands as inlineToolCommands } from "../../src/inlineTool";
import { Doc } from "../../src";
// import { data } from './data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
// import { data } from './data/multiPara'
// import { data } from './data/playgroundMultiPara'


// @ts-ignore @vite-ignore
const { data } = await import(`./data/${searchObj.data || 'singleSection'}`)
const rootElement = document.getElementById('root')!
rootElement.style.position = 'relative'

const doc = new Doc(
    data,
    rootElement,
    [...markdownPlugins(), ...inlineToolCommands()]
    // []，

)


Object.assign(window, {
    pw: {
        get doc() {
            return doc.root
        },
        get docElement() {
            return doc.element
        },
        screen,
        state,
        actions,
        partialMatch,
        deepMatch,
        expect
    },
    createElement,
})
// 一定要放最后，这个时候才触发 test case
doc.render()




