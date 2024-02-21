import {createElement, RxList, atom, Atom, computed,} from "axii";
import {AxiiComponent, DocumentContent, Paragraph, Text} from "../DocumentContent.js";
import {DocumentData, Document} from "../Document.js";
import {Heading} from "./Heading.js";
import {OLItem} from "./OLItem.js";
import {ULItem} from "./ULItem.js";
import {InlineCode} from "./InlineCode.js";
import {Code} from "./CodeMirror.js";
import {Link} from "./Link.js";
import {defaultMarkdownPlugins as markdownPlugins} from "../plugins/markdown.js";
import {createBlockTool, InsertWidget} from "../plugins/BlockTool.js";
import {createRangeTool, defaultFormatWidgets} from "../plugins/RangeTool.js";
import {createSuggestionTool, defaultSuggestionWidgets} from "../plugins/SuggestionTool.js";
import {scaffold, ScaffoldHandle} from "../scaffold.js";
import AddRoundIcon from "../icons/AddRound.js";
import DeleteRound from "../icons/DeleteRound.js";
import {Drag} from "../lib/Drag.js";

// FIXME 这里应该从 context 里面读取。
const types = {
    Paragraph,
    Text,
    Heading,
    OLItem,
    ULItem,
    InlineCode,
    Code,
    Link,
}

export type GridData = {
    columnWidth: number[],
    data: DocumentData[][]
}

const HANDLE_SIZE = 10
const TABLE_BORDER_COLOR = '#dee0e3'

export class Grid extends AxiiComponent {
    public columnWidth: RxList<Atom<number>>
    public innerData: RxList<RxList<ScaffoldHandle>>
    public pluginContainer: HTMLElement
    public hover = atom(false)

    constructor(data?: GridData) {
        super(data);
        const defaultColumn = [100, 100]
        this.columnWidth = new RxList<Atom<number>>((data?.columnWidth || defaultColumn).map((width) => atom(width)))
        // 初始化一排原始数据
        const originData: DocumentData[][] = data?.data || [
            defaultColumn.map((c: any) => Document.createEmptyDocumentData())
        ]

        this.pluginContainer = <div></div> as HTMLElement

        this.innerData = new RxList((originData).map((row) => new RxList(
            row.map((cell) => {
                return this.createInnerDocument(cell)
            })
        )))

    }

    createInnerDocument(data = Document.createEmptyDocumentData()) {
        const container = <div></div> as HTMLElement
        const plugins = [
            ...markdownPlugins,
            createRangeTool(defaultFormatWidgets),
            createSuggestionTool('/', defaultSuggestionWidgets)
        ]
        // plugin 显示在外面
        return scaffold(container, {data, types, plugins}, {pluginContainer: this.pluginContainer})
    }

    addRow = (beforeIndex: number) => {
        const newRow = this.columnWidth.map(() => this.createInnerDocument())
        this.innerData.splice(beforeIndex, 0, newRow)
        newRow.forEach((doc) => {
            doc.render()
        })
    }

    deleteRow(index: number) {
        this.innerData.at(index)!.forEach((doc) => {
            doc.destroy()
        })
        this.innerData.splice(index, 1)
    }

    addColumn = (beforeIndex: number) => {
        this.columnWidth.splice(beforeIndex, 0, atom(100))
        this.innerData.forEach((row) => {
            const newDoc = this.createInnerDocument()
            row.splice(beforeIndex, 0, newDoc)
            newDoc.render()
        })
    }

    deleteColumn(index: number) {
        this.columnWidth.splice(index, 1)

        this.innerData.forEach((row) => {
            row.at(index)!.destroy()
            row.splice(index, 1)
        })
    }

    destroy() {
        super.destroy();
        this.innerData.forEach((row) => {
            row.forEach((doc) => {
                doc.destroy()
            })
        })
    }

    onMount() {
        super.onMount();
        this.innerData.forEach((row) => {
            row.forEach((doc) => {
                doc.render()
            })
        })
    }

    renderInner() {
        const topHandleStyle = () => ({
            position: 'absolute',
            display: this.hover() ? 'flex' : 'none',
            left: 0,
            top: 0,
            flexWrap: 'nowrap',
            height: HANDLE_SIZE
        })

        const topHandle = (
            <div style={topHandleStyle}>
                {
                    this.columnWidth.map((width, index) => {
                        const addIcon = (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: HANDLE_SIZE,
                                    display: 'flex',
                                    cursor: 'pointer'
                                }}
                            >
                                { index!() !== 0 ? null : (
                                    <span
                                        style={{
                                            width: HANDLE_SIZE,
                                            height: HANDLE_SIZE,
                                            display: 'flex',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => this.addColumn(index!())}>
                                        <AddRoundIcon size={10}/>
                                    </span>
                                )}
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: HANDLE_SIZE,
                                        height: HANDLE_SIZE,
                                        display: 'flex',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => this.deleteColumn(index!())}
                                >
                                    <DeleteRound size={10}/>
                                </span>
                                <span
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        width: HANDLE_SIZE,
                                        height: HANDLE_SIZE,
                                        display: 'flex',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => this.addColumn(index!())}>
                                    <AddRoundIcon size={10}/>
                                </span>
                            </div>
                        )

                        const handleStyle = () => {
                            return {
                                position: 'relative',
                                flexShrink: 0,
                                borderLeft: `1px ${TABLE_BORDER_COLOR} solid`,
                                boxSize: 'border-box',
                                width: width() - 1,
                                height: HANDLE_SIZE,
                                background: '#eee',
                                overflow: 'visible'
                            }
                        }
                        return <div style={handleStyle}>{addIcon}</div>
                    })}


            </div>
        )


        const style = {
            position: 'relative',
            width: '100%',
        }

        const borderStyle = {
            borderCollapse: 'collapse',
            border: '1px solid #dee0e3',
        }

        const tableStyle = () => {
            let width = 0
            this.columnWidth.forEach((w) => {
                width += w()
            })
            return ({
                ...borderStyle,
                tableLayout: 'fixed',
                width
            })
        }

        return (
            <div
                style={style}
                contenteditable={false}
                onmouseenter={() => this.hover(true)}
                onmouseleave={() => this.hover(false)}
            >
                {this.pluginContainer}
                <div style={{position: 'relative', overflowX: 'auto', width: '100%', paddingTop: HANDLE_SIZE,}}>
                    <table style={tableStyle}>
                        <colgroup>
                            {this.columnWidth.map((width) => {
                                return <col style={() => ({width: width(), tableLayout: 'fixed'})}/>
                            })}
                        </colgroup>
                        {this.innerData.map((row, rowIndex) => (
                            <tr>
                                {row.map((cell, index) => {
                                    const style = () => ({
                                        display: this.hover() ? 'block' : 'none',
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        height: '100%',
                                        width: HANDLE_SIZE
                                    })
                                    const leftHandle = () => index!() !== 0 ? null :
                                        (
                                            <div style={style}>
                                                {() => rowIndex!() !==0 ? null : (
                                                    <span
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: HANDLE_SIZE,
                                                            height: HANDLE_SIZE,
                                                            display: 'flex',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => this.addRow(index!())}>
                                                    <AddRoundIcon size={10}/>
                                                </span>
                                                )}
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        left: 0,
                                                        width: HANDLE_SIZE,
                                                        height: HANDLE_SIZE,
                                                        display: 'flex',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => this.deleteRow(index!())}
                                                >
                                                    <DeleteRound size={10}/>
                                                </span>
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        width: HANDLE_SIZE,
                                                        height: HANDLE_SIZE,
                                                        display: 'flex',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => this.addRow(index!() + 1)}>
                                                    <AddRoundIcon size={10}/>
                                                </span>
                                            </div>
                                        )

                                    const delta = atom({x: this.columnWidth.at(index!)!.raw, y: 0})

                                    // 绑定宽度和 computed
                                    computed(() => {
                                        this.columnWidth.at(index!)!(delta().x)
                                    })


                                    const rightHandle = <Drag
                                        style={{height: '100%', width: HANDLE_SIZE, position: 'absolute', right: 0, top: 0, cursor: 'col-resize'}}
                                        delta={delta}
                                    />

                                    return (
                                        <td style={{...borderStyle, position: 'relative'}}>
                                            <div style={{padding: 10}}>
                                                {cell.container}
                                            </div>
                                            {leftHandle}
                                            {rightHandle}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </table>
                    {topHandle}
                </div>
            </div>
        )
    }
}