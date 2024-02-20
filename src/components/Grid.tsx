import {createElement, RxList, atom, Atom} from "axii";
import {AxiiComponent, DocumentContent, Paragraph, Text} from "../DocumentContent.js";
import {DocumentData, Document} from "../Document.js";
import {Heading} from "./Heading.js";
import {OLItem} from "./OLItem.js";
import {ULItem} from "./ULItem.js";
import {InlineCode} from "./InlineCode.js";
import {Code} from "./CodeMirror.js";
import {Link} from "./Link.js";
import {plugins as markdownPlugins} from "../plugins/markdown.js";
import {createBlockTool, InsertWidget} from "../plugins/BlockTool.js";
import {createRangeTool, defaultFormatWidgets} from "../plugins/RangeTool.js";
import {createSuggestionTool, defaultSuggestionWidgets} from "../plugins/SuggestionTool.js";
import {scaffold, ScaffoldHandle} from "../scaffold.js";

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

export class Grid extends AxiiComponent {
    public columnWidth: RxList<Atom<number>>
    public innerData: RxList<RxList<ScaffoldHandle>>
    public pluginContainer  : HTMLElement
    constructor(data?: GridData) {
        super(data);
        const defaultColumn = [100, 100, 100, 100, 100]
        this.columnWidth = new RxList<Atom<number>>((data?.columnWidth || defaultColumn).map((width) => atom(width)))
        // 初始化一排原始数据
        const originData: DocumentData[][] = data?.data || [
            defaultColumn.map((c : any) => Document.createEmptyDocumentData())
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
            createRangeTool( defaultFormatWidgets ),
            createSuggestionTool('/',  defaultSuggestionWidgets)
        ]
        // plugin 显示在外面
        return scaffold(container, {data, types, plugins}, {pluginContainer: this.pluginContainer})
    }
    addRow = () => {
        const newRow = this.columnWidth.map(() => this.createInnerDocument())
        this.innerData.push(newRow)
        newRow.forEach((doc) => {
            doc.render()
        })
    }
    addColumn = () => {
        this.columnWidth.push(atom(100))
        this.innerData.forEach((row) => {
            const newDoc = this.createInnerDocument()
            row.push(newDoc)
            newDoc.render()
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
        const topHandle = (<div style={{left:0, top:-10, width:'100%', height:10}}></div>)
        const leftHandle = (<div style={{left:-10, top:0, height:'100%', width:10}}></div>)

        const style = {
            position:'relative',
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

        return <div style={style} contenteditable={false}>
            {this.pluginContainer}
            <div style={{overflowX: 'auto', width: '100%'}}>
                <table style={tableStyle}>
                    <colgroup>
                        {this.columnWidth.map((width) => {
                            return <col style={() => ({width: width(), tableLayout: 'fixed'})}/>
                        })}
                    </colgroup>
                    {this.innerData.map((row) => (
                        <tr>
                            {row.map((cell) => {
                                return (
                                    <td style={borderStyle}>
                                        {cell.container}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </table>
            </div>
        </div>
    }
}