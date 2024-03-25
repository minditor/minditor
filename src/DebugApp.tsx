import {Document} from "./Document.js";
import {Atom, atom, createElement} from "axii";
import {Packet} from "./DocumentContentHistory.js";
import {EmitData, EVENT_ANY} from "./DocumentContent.js";

export function DebugApp({doc}: { doc: Document }) {
    const historyPackets = atom<any>([])
    const undoIndex = atom(0)
    const currentPacket: Atom<Packet | null> = atom(null)
    doc.history.on(EVENT_ANY, () => {
        historyPackets(doc.history.packets)
        undoIndex(doc.history.undoIndex)
        currentPacket(doc.history.currentPacket)
    })

    const contentData = atom(doc.content.toJSON())
    doc.content.on(EVENT_ANY, () => contentData(doc.content.toJSON()))
    return (
        <div style={{display: 'flex', maxHeight: '100%', overflow: "auto", flexShrink: 0, minWidth: 0}}>
            <div style={{flexGrow: 1, overflow: 'auto', maxHeight: '100%', fontSize: 11}}>
                <pre>
                <code>
                {() => JSON.stringify(contentData(), null, 4)}
                </code>
            </pre>
            </div>
            <div style={{flexGrow: 1, overflow: 'auto', maxHeight: '100%', fontSize: 12, flexShrink: 0, minWidth: 0}}>
                <div>
                    {() => JSON.stringify(doc.view.state.selectionRange())}
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