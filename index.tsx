import {
    Code,
    createBlockTool,
    createRangeTool,
    createSuggestionTool,
    defaultBlockWidgets,
    defaultFormatWidgets,
    defaultMarkdownPlugins,
    defaultSuggestionWidgets,
    Grid,
    Heading,
    InlineImageBlock,
    InlineCode,
    Link,
    OLItem,
    Paragraph,
    scaffold,
    Text,
    ULItem, BlockData, DocumentData
} from "./src/index.js";
import {createTOCTool} from "./src/plugins/TOCTool.js";

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
    Image: InlineImageBlock
}

const plugins = [
    ...defaultMarkdownPlugins,
    createBlockTool(defaultBlockWidgets),
    createRangeTool( defaultFormatWidgets ),
    createSuggestionTool(defaultSuggestionWidgets),
    createTOCTool()
]

async function callApi(apiName: string, data: any) {
    const res = await fetch(`http://localhost:8080/api/${apiName}`, {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return await res.json()
}

const jsonData: DocumentData = await callApi('readFile', ['/Users/camus/Work/minditor/readme1.json'])

const result = scaffold(root, {data: jsonData, types, plugins}, )
result.render()

document.addEventListener('keydown', async (e) => {
    if (e.key === 's' && e.metaKey) {
        e.preventDefault()
        console.log('save', result.doc.toJSON())
        await callApi('writeFile', ['/Users/camus/Work/minditor/readme1.json', JSON.stringify(result.doc.toJSON())])
    }
})
