import jsonData from './readme1.json'
import {Code, Heading, InlineCode, OLItem, Paragraph, Text, ULItem} from "./src/index.js";
import {plugins as markdownPlugins} from "./src/plugins/markdown.js";
import {createBlockTool, InsertWidget} from "./src/plugins/BlockTool.js";
import {scaffold} from "./src/scaffold.js";

const root= document.getElementById('root')!
const types = {
    Paragraph, Text, Heading, OLItem, ULItem, InlineCode, Code
}

const plugins = [...markdownPlugins, createBlockTool([InsertWidget])]
scaffold(root, {data: jsonData, types, plugins}, { debug: true })


