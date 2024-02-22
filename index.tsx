import jsonData from './readme1.json'
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
    ImageBlock,
    ImageInsertWidget,
    createBlockTool,
    scaffold,
    createRangeTool,
    defaultFormatWidgets,
    createSuggestionTool,
    defaultSuggestionWidgets,
    defaultMarkdownPlugins,
    GridInsertWidget
} from "./src/index.js";

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
    Image: ImageBlock
}

const plugins = [
    ...defaultMarkdownPlugins,
    createBlockTool([ImageInsertWidget, GridInsertWidget]),
    createRangeTool( defaultFormatWidgets ),
    createSuggestionTool('/',  defaultSuggestionWidgets)
]
const result = scaffold(root, {data: jsonData, types, plugins}, { debug: true })
result.render()


