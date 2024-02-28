import {Atom, atom, createElement, createRoot, Fragment, Host} from "axii";
import {Document, DocumentData} from "./Document.js";
import {DocNode, EmitData, EVENT_ANY} from "./DocumentContent.js";
import {Plugin} from "./Plugin.js";
import {GlobalState} from "./globals.js";
import jsonData from "../readme1.json";
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


    // CAUTION 为了实现 doc-scroll-container 在外层控了高度的时候不超出高度，没控制高度的时候能自由增长，必须用 flex 的这个方案。
    container.style.display = 'flex'
    container.style.flexDirection = 'column'

    // TODO 检查父元素的 overflow 设置会不会到值 plugin 显示不出来。

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

    // 1. axii app 先render，确保节点在 dom 上
    const appRoot = createRoot(container)
    appRoot.render(appElement)

    // 3. plugins render
    const pluginInstances = docConfig.plugins.map(Plugin => {
        return new Plugin(doc)
    })


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
            doc.render()
            pluginInstances.forEach(plugin => {
                plugin.renderPluginView(!!config?.pluginContainer)
                pluginContainer!.appendChild(plugin.root?.element!)
            })
        }
    }

}
