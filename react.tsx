import {Code, Heading, InlineCode, OLItem, Paragraph, Text, ULItem, Link, Grid, Component} from "./src/index.js";
import {defaultMarkdownPlugins as markdownPlugins} from "./src/plugins/markdown.js";
import {createBlockTool, defaultBlockWidgets} from "./src/plugins/BlockTool.js";
import {scaffold} from "./src/scaffold.js";
import {createRangeTool, defaultFormatWidgets} from "./src/plugins/RangeTool.js";
import { createSuggestionTool, defaultSuggestionWidgets } from "./src/plugins/SuggestionTool.js";

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


