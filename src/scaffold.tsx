import {Atom, atom, createElement, createRoot, Fragment} from "axii";
import {Document, DocumentData} from "./Document.js";
import {DocNode, EmitData, EVENT_ANY} from "./DocumentContent.js";
import {Plugin} from "./Plugin.js";
import {GlobalState} from "./globals.js";
import jsonData from "../readme1.json";
import {Packet} from "./DocumentContentHistory.js";

export type ScaffoldConfig = {
    debug?: boolean
}

export type DocConfig = {
    data: DocumentData,
    types: {[k: string]: typeof DocNode},
    plugins: (typeof Plugin)[]
    globalState?: GlobalState
}


function DebugApp({  doc }: {doc: Document}) {
    const historyPackets = atom<any>([])
    const undoIndex = atom(0)
    const currentPacket: Atom<Packet|null> = atom(null)
    doc.history.on(EVENT_ANY, () => {
        historyPackets(doc.history.packets)
        undoIndex(doc.history.undoIndex)
        currentPacket(doc.history.currentPacket)
    })

    const contentData = atom(doc.content.toJSON())
    doc.content.on(EVENT_ANY, () => contentData(doc.content.toJSON()))
    return (
        <div style={{display: 'flex', height: '100%'}}>
            <div style={{flexGrow: 1, flexShrink: 0, overflow: 'auto', height: '100%', fontSize:11}}>
                <pre>
                <code>
                {() => JSON.stringify(contentData(), null, 4)}
                </code>
            </pre>
            </div>
            <div style={{flexGrow: 1, flexShrink: 0, overflow: 'auto', height: '100%', fontSize:12}}>
                <div>
                    <button onClick={() => doc.history.undo()}>undo</button>
                    <button onClick={() => doc.history.redo()}>redo</button>
                </div>
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
}

export function scaffold(container: HTMLElement, docConfig: DocConfig, config?: ScaffoldConfig) {

    let docScrollContainer
    let pluginContainer

    const docApp = (
        <>
            {docScrollContainer =
                <div className="doc-scroll-container" style={{height: 'inherit', overflowY: 'scroll'}}/>}
            {pluginContainer = <div className="plugin-container"
                                    style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}/>}
        </>
    )

    const doc = new Document(docScrollContainer as unknown as HTMLElement, docConfig.data, docConfig.types, docConfig.globalState)

    const appElement = config?.debug ? (
        <div style={{display:"flex", height:'inherit'}}>
            {docApp}
            <DebugApp doc={doc} />
        </div>
    ) : docApp

    // 1. axii app 先render，确保节点在 dom 上
    const appRoot = createRoot(container).render(appElement)

    // 2. doc render
    doc.render()

    // 3. plugins render
    const pluginInstances = docConfig.plugins.map(Plugin => {
        return new Plugin(doc)
    })

    pluginInstances.forEach(plugin => {
        plugin.renderPluginView()
        pluginContainer!.appendChild(plugin.root?.element!)
    })

    return {
        appRoot,
        doc,
        destroy:() => {
            pluginInstances.forEach(plugin => plugin.destroy())
            doc.destroy()
            appRoot.destroy()
        }
    }

}
