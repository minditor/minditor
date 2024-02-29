import {Atom, atom, createElement, createRoot, Fragment} from "axii";
import {Document, DocumentData} from "./Document.js";
import {DocNode, EmitData, EVENT_ANY} from "./DocumentContent.js";
import {Plugin} from "./Plugin.js";
import {GlobalState} from "./globals.js";
import {Packet} from "./DocumentContentHistory.js";

export type ScaffoldConfig = {
    debug?: boolean,
    pluginContainer?: HTMLElement
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
        <div style={{display: 'flex', maxHeight: '100%', overflow: "auto", flexShrink:0, minWidth:0}}>
            <div style={{flexGrow: 1, overflow: 'auto', maxHeight: '100%', fontSize:11}}>
                <pre>
                <code>
                {() => JSON.stringify(contentData(), null, 4)}
                </code>
            </pre>
            </div>
            <div style={{flexGrow: 1, overflow: 'auto', maxHeight: '100%', fontSize:12, flexShrink:0, minWidth:0}}>
                <div>
                    {() => JSON.stringify(doc.view.state.selectionRange()) }
                </div>
                <div>
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
        </div>
    )
}

export type ScaffoldHandle = {
    pluginContainer: HTMLElement,
    container: HTMLElement,
    appRoot: ReturnType<typeof createRoot>,
    doc: Document,
    destroy: () => void,
    render: () => void
}

export function scaffold(container: HTMLElement, docConfig: DocConfig, config?: ScaffoldConfig): ScaffoldHandle {
    // CAUTION we use flex to layout the app, so when container has a fixed height, the app will be fixed height.
    //  when container has no fixed height, the app will auto grow as its contents grow.
    container.style.display = 'flex'
    container.style.flexDirection = 'column'

    const docScrollContainer = <div
        className="doc-scroll-container"
        style={{flexGrow: 1, flexBasis: 300, overflowY: 'scroll'}}
    /> as HTMLElement
    const pluginContainer = config?.pluginContainer || <div className="plugin-container"/> as HTMLElement
    pluginContainer.style.position = 'absolute'
    pluginContainer.style.left = '0px'
    pluginContainer.style.top = '0px'
    pluginContainer.style.height = '100%'
    pluginContainer.style.width = '0px'
    pluginContainer.style.overflow = 'visible'

    const doc = new Document(docScrollContainer as HTMLElement, docConfig.data, docConfig.types, docConfig.globalState)

    const appElement = config?.debug ? (
        <div style={{flexGrow: 1, display: "flex", minHeight: 0}}>
            <div style={{flexGrow: 1, display: "flex", flexDirection: 'column', maxWidth: 300}}>
                {docScrollContainer}
                {pluginContainer}
            </div>
            <div style={{flexGrow: 2, overflow: 'auto'}}>
                <DebugApp doc={doc}/>
            </div>
        </div>
    ) : (
        <>
            {docScrollContainer}
            {pluginContainer}
        </>
    )

    const appRoot = createRoot(container)

    let pluginInstances: Plugin[] = []

    return {
        container,
        pluginContainer,
        appRoot,
        doc,
        destroy:() => {
            pluginInstances.forEach(plugin => plugin.destroy())
            doc.destroy()
            appRoot.destroy()
        },
        render() {
            // user may render loading inside container before rendering the doc.
            container.innerHTML = ''
            // 1. axii app 先render，确保节点在 dom 上
            appRoot.render(appElement)

            // 2. plugins render
            pluginInstances = docConfig.plugins.map(Plugin => {
                return new Plugin(doc)
            })
            // 3. doc render
            doc.render()
            pluginInstances.forEach(plugin => {
                plugin.renderPluginView(!!config?.pluginContainer)
                pluginContainer!.appendChild(plugin.root?.element!)
            })
        }
    }

}
