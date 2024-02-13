import {createRoot, createElement} from "axii";
import jsonData from './readme1.json'
import {Document,Heading, OLItem, Paragraph, Text, ULItem} from "./src/index.js";
import {plugins as markdownPlugins} from "./src/plugins/markdown.js";


const docRoot= document.getElementById('doc-root')!
const types = {
    Paragraph, Text, Heading, OLItem, ULItem
}

const myDoc = new Document(docRoot,  jsonData, types, [])
myDoc.render()

const newText = new Text({value: 'hello'})
const newParagraph = new Paragraph()
newParagraph.firstChild = newText
myDoc.content.append(newParagraph, myDoc.content.firstChild)


const pluginRoot = document.getElementById('plugin-root')!
markdownPlugins.forEach(Plugin => {
    const plugin  = new Plugin(myDoc)
    plugin.renderPluginView()
    pluginRoot.appendChild(plugin.root?.element!)
})


const debugRoot = document.getElementById('debug-root')!
createRoot(debugRoot).render(
    <div>
        <div>
            <button onClick={() => myDoc.history.undo()}>undo</button>
            <button onClick={() => myDoc.history.redo()}>redo</button>
        </div>
        <pre>
            <code>
            {() => JSON.stringify(myDoc.view.debugJSONContent(), null, 4)}
            </code>
        </pre>
    </div>
)