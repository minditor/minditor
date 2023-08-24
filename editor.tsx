/**@jsx createElement*/
import {ANY, DocumentContent} from "./src/Content";
import { DocumentContentView } from "./src/View";
import {Document} from "./src/Document";
import {Paragraph, Section, Text, ListItem} from "./src/DocNode";
import { Image, ImageSuggestionWidget } from "./src/components/Image";
import { Code, CodeSuggestionWidget} from "./src/components/Code";
import { createRoot, createElement } from 'axii'
import { atom } from 'rata'
import { plugins as markdownPlugins } from "./src/plugins/markdown";
import { createRangeTool, defaultFormatWidgets } from './src/plugins/RangeTool'
import { createSuggestionTool, defaultBlockSuggestionWidgets } from './src/plugins/SuggestionTool'
import { BlockTool } from "./src/plugins/BlockTool";
import data from './README.json'

const doc = new Document(
    document.getElementById('root')!,
    // data.singlePara,
    // data.multiPara,
    // data.multiSection,
    // data.singleSection,
    // data.singleList,
    // data.nestedList,
    data,
    {Paragraph, Section, Text, ListItem, Image, Code},
    [
        ...markdownPlugins,
        createRangeTool(defaultFormatWidgets),
        createSuggestionTool('/', true, defaultBlockSuggestionWidgets.concat(
            ImageSuggestionWidget,
            CodeSuggestionWidget
        )),
        BlockTool
    ]
)
doc.render()



async function saveFile() {
    const newHandle = await window.showSaveFilePicker();
    const writableStream = await newHandle.createWritable();
    await writableStream.write(JSON.stringify(doc!.toJSON()));
    await writableStream.close();
}


document.addEventListener('keydown', (e) => {
    console.log(e)
    if (e.key === 's' && e.metaKey) {
        e.preventDefault()
        saveFile()
    }
})
