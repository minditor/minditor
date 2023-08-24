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

const editorRoot = createRoot(document.getElementById('editor'))
editorRoot.render(<div>
    <button onClick={getTheFile}>open file</button>
    <button onClick={saveFile}>save file</button>
</div>)

const pickerOpts = {
    multiple: false,
};

let doc
async function getTheFile() {
    // Open file picker and destructure the result the first handle
    const [fileHandle] = await window.showOpenFilePicker(pickerOpts);

    // get file contents
    const data = JSON.parse(await (await fileHandle.getFile()).text());


    doc = new Document(
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
}


async function saveFile(data) {
    // create a new handle
    const newHandle = await window.showSaveFilePicker();

    // create a FileSystemWritableFileStream to write to
    const writableStream = await newHandle.createWritable();

    // write our file
    await writableStream.write(JSON.stringify(doc!.toJSON()));

    // close the file and write the contents to disk.
    await writableStream.close();
}
