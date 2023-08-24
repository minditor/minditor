import { Document } from "minditor";
import { atom } from 'rata'
import {createRoot} from 'axii'
import { createRangeTool, defaultFormatWidgets } from 'minditor/plugins/RangeTool'


class MockDocument extends Document {
    view = {
        state: {
            visibleRangeRect: atom({top: 100, left: 0}) ,
            lastActiveDevice: atom('mouse'),
            contentRange: atom({}),
            mousePosition: atom({})
        }
    }
}


const RangeTool = createRangeTool(defaultFormatWidgets)

const rootEl = document.getElementById('root')
const rangeTool = new RangeTool(new MockDocument(rootEl, {children: []}, {}, []))

const root = createRoot(rootEl)
root.render(rangeTool.render())

