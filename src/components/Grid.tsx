import {atom, Atom, computed, createElement, RxList,} from "axii";
import {Paragraph, Text} from "../DocumentContent.js";
import {Document, DocumentData} from "../Document.js";
import {Heading} from "./Heading.js";
import {OLItem} from "./OLItem.js";
import {ULItem} from "./ULItem.js";
import {InlineCode} from "./InlineCode.js";
import {Code} from "./CodeMirror.js";
import {Link} from "./Link.js";
import {defaultMarkdownPlugins as markdownPlugins} from "../plugins/markdown.js";
import {createRangeTool, defaultFormatWidgets} from "../plugins/RangeTool.js";
import {createSuggestionTool, defaultSuggestionWidgets} from "../plugins/SuggestionTool.js";
import {scaffold, ScaffoldHandle} from "../scaffold.js";
import AddRoundIcon from "../icons/AddRound.js";
import DeleteRound from "../icons/DeleteRound.js";
import {Drag} from "../lib/Drag.js";
import {AxiiComponent} from "../AxiiComponent.js";

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
    columns: number[],
    data: DocumentData[][]
}

const HANDLE_SIZE = 10
const TABLE_BORDER_COLOR = '#dee0e3'

export class Grid extends AxiiComponent {
    public columns: RxList<Atom<number>>
    public innerData: RxList<RxList<ScaffoldHandle>>
    public pluginContainer: HTMLElement
    public hover = atom(false)

    constructor(data?: GridData) {
        super(data);
        const defaultColumn = [100, 100]
        this.columns = new RxList<Atom<number>>((data?.columns || defaultColumn).map((width) => atom(width)))
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
        const newRow = this.columns.map(() => this.createInnerDocument())
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
        this.columns.splice(beforeIndex, 0, atom(100))
        this.innerData.forEach((row) => {
            const newDoc = this.createInnerDocument()
            row.splice(beforeIndex, 0, newDoc)
            newDoc.render()
        })
    }

    deleteColumn(index: number) {
        this.columns.splice(index, 1)

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
    renderTopHandle() {
        const topHandleStyle = () => ({
            position: 'absolute',
            display: this.hover() ? 'flex' : 'none',
            left: 0,
            top: 0,
            flexWrap: 'nowrap',
            height: HANDLE_SIZE
        })

        return (
            <div style={topHandleStyle}>
                {
                    this.columns.map((width, index) => {
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

    }
    renderLeftHandle(rowIndex: Atom<number>, index: Atom<number>) {
        const style = () => ({
            display: this.hover() ? 'block' : 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: HANDLE_SIZE
        })
        return () => index!() !== 0 ? null :
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
    }
    renderRightHandle(index: Atom<number>) {
        const delta = atom({x: this.columns.at(index!)!.raw, y: 0})
        // 绑定宽度和 computed
        computed(() => {
            this.columns.at(index!)!(delta().x)
        })

        return <Drag
            style={{height: '100%', width: HANDLE_SIZE, position: 'absolute', right: 0, top: 0, cursor: 'col-resize'}}
            delta={delta}
        />
    }
    renderInner() {
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
            this.columns.forEach((w) => {
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
                            {this.columns.map((width) => {
                                return <col style={() => ({width: width(), tableLayout: 'fixed'})}/>
                            })}
                        </colgroup>
                        {this.innerData.map((row, rowIndex) => (
                            <tr>
                                {row.map((cell, index) => {
                                    return (
                                        <td style={{...borderStyle, position: 'relative'}}>
                                            <div style={{padding: 10}}>
                                                {cell.container}
                                            </div>
                                            {this.renderLeftHandle(rowIndex!, index!)}
                                            {this.renderRightHandle(index!)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </table>
                    {this.renderTopHandle()}
                </div>
            </div>
        )
    }
}


// 提供给 Plugin 用的
export type GridPluginProps = {
    onChange: (data: [number, number]) => void,
    size: [number, number],
    unitSize: number
}

export function GridPicker({onChange, size, unitSize}: GridPluginProps) {
    // 用 table 渲染出  size 指定的 x * y 的格子
    const hoverPosition = atom({x: -1, y: -1})
    return (
        <table
            style={{borderCollapse: 'collapse', width: '100%', height: '100%'}}
            onMouseLeave={() => hoverPosition({x: -1, y: -1})}
        >
            <tbody>
            {Array.from({length: size[1]}).map((_, y) => (
                <tr>
                    {Array.from({length: size[0]}).map((_, x) => {
                        const style = () => ({
                            width: unitSize,
                            height: unitSize,
                            background: x < (hoverPosition().x+1)  && y < (hoverPosition().y+1)  ? '#e5e5e5' : 'white'
                        })

                        return (
                            <td
                                style={{border: '1px solid #eee'}}
                                onMouseEnter={() => hoverPosition({x, y})}
                                onClick={() => onChange([x+1, y+1])}
                            >
                                <div style={style}></div>
                            </td>
                        )
                    })}
                </tr>
            ))}
            </tbody>
        </table>
    )
}
