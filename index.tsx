import {createRoot, createElement} from "axii";
import jsonData from './readme1.json'
import {Document,Heading, OLItem, Paragraph, Text, ULItem} from "./src/index.js";


const root= document.getElementById('root')!
const types = {
    Paragraph, Text, Heading, OLItem, ULItem
}

const myDoc = new Document(root,  jsonData, types, [])
myDoc.render()

const newText = new Text({value: 'hello'})
const newParagraph = new Paragraph()
newParagraph.firstChild = newText

myDoc.content.append(newParagraph, myDoc.content.firstChild)

const debugRoot = document.getElementById('debug-root')!

createRoot(debugRoot).render(<pre>
    <code>
    {() => JSON.stringify(myDoc.view.debugJSONContent(), null, 4)}
    </code>
</pre>)