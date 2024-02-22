import {
    Code,
    Heading,
    InlineCode,
    OLItem,
    Paragraph,
    Text,
    ULItem,
    Link,
    Grid,
    defaultMarkdownPlugins as markdownPlugins,
    createBlockTool, defaultBlockWidgets,
    scaffold,
    createRangeTool, defaultFormatWidgets,
    createSuggestionTool, defaultSuggestionWidgets,
    Component
} from "./src/index.js";

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { createRoot } from 'react-dom/client';
/*@ts-ignore*/
import { createElement } from 'react';


const jsonData = {
    "name": "readme",
    "children": [{
        type: 'Calendar',
        content: []
    }]
}

class Calendar extends Component {
    static displayName = 'Calendar'
    render() {
        const container = document.createElement('div')
        container.contentEditable = 'false'
        const root = createRoot(container);
        root.render(createElement(DayPicker, {mode: 'single'}));
        return container
    }
}

const root= document.getElementById('root')!
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
    Calendar
}



const plugins = [
    ...markdownPlugins,
    createBlockTool(defaultBlockWidgets),
    createRangeTool( defaultFormatWidgets ),
    createSuggestionTool('/',  defaultSuggestionWidgets)
]
const result = scaffold(root, {data: jsonData, types, plugins}, { debug: true })
result.render()


