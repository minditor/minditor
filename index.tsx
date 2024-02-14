import {createRoot, createElement, atom, Atom} from "axii";
import jsonData from './readme1.json'
import {Document, EmitData, EVENT_ANY, Heading, OLItem, Packet, Paragraph, Text, ULItem} from "./src/index.js";
import {plugins as markdownPlugins} from "./src/plugins/markdown.js";


const docRoot= document.getElementById('doc-root')!
const types = {
    Paragraph, Text, Heading, OLItem, ULItem
}

const myDoc = new Document(docRoot,  jsonData, types, [])
myDoc.render()


const pluginRoot = document.getElementById('plugin-root')!
markdownPlugins.forEach(Plugin => {
    const plugin  = new Plugin(myDoc)
    plugin.renderPluginView()
    pluginRoot.appendChild(plugin.root?.element!)
})



const historyPackets = atom<any>([])
const undoIndex = atom(0)
const currentPacket: Atom<Packet|null> = atom(null)
myDoc.history.on(EVENT_ANY, () => {
    historyPackets(myDoc.history.packets)
    undoIndex(myDoc.history.undoIndex)
    currentPacket(myDoc.history.currentPacket)
})

const debugRoot = document.getElementById('debug-root')!
createRoot(debugRoot).render(
    <div style={{display: 'flex', height: '100%'}}>
        <div style={{flexGrow: 1,  flexShrink:0, overflow:'auto'}}>
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
        <div style={{flexGrow: 1,flexShrink:0, overflow:'auto'}}>
            <div>undoIndex: {undoIndex}</div>
            <div>
                <div>current packet stack</div>
                <div>
                    {() => {
                        return currentPacket()?.stack.map((event: EmitData<any, any>) => {
                            return <div>
                                <span>event: {event.method}</span>
                                <span>  args: {JSON.stringify(event.args)}</span>
                            </div>
                        })
                    }}
                </div>
            </div>
            <div>
                <div>packets</div>
                <div>
                    {() => {
                        return historyPackets().map((packet: Packet) => {
                            return <div>
                                {packet.stack.map((event: EmitData<any, any>) => {
                                    return <div>
                                        <span>event: {event.method}</span>
                                        <span>  args: {JSON.stringify(event.args)}</span>
                                        <span>  result: {JSON.stringify(event.result)}</span>
                                    </div>
                                })}
                                <div>-----------------</div>
                            </div>
                        })
                    }}
                </div>
            </div>
        </div>
    </div>
)