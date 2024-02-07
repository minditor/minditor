import {Heading, OLItem, Paragraph, Text, ULItem} from "./src/DocumentContent.js";
import jsonData from './readme1.json'
import {Document} from "./src/index.js";


const root= document.getElementById('root')
const types = {
    Paragraph, Text, Heading, OLItem, ULItem
}

const myDoc = new Document(root,  jsonData, types, [])
myDoc.render()

const newText = new Text({value: 'hello'})
const newParagraph = new Paragraph()
newParagraph.firstChild = newText


myDoc.content.append(newParagraph, myDoc.content.head)

