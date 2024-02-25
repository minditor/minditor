/**@jsx createElement*/
import {atom, createElement} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
import {BlockData, Paragraph, TextBasedBlock} from "../DocumentContent.js";
import Menu from "../icons/Menu.js";
import {CodeInsertHandle, GridInsertHandle, ImageInsertHandle} from "./SuggestionTool.js";
import Delete from "../icons/Delete.js";
import Copy from "../icons/Copy.js";
import Cut from "../icons/Cut.js";

class BlockToolPlugin extends Plugin {
    public static displayName = `BlockTool`
    public items: BlockToolWidget[] = []
}

export function createBlockTool(BlockToolWidgets: Array<typeof BlockToolWidget>) {
    return class OneBlockToolPlugin extends BlockToolPlugin {
        constructor(doc: Document) {
            super(doc);
            this.items = BlockToolWidgets.map(Item => new Item(doc, this))
        }

        calculatePosition(outsideDocBoundary: boolean) {
            const {lastMouseEnteredBlock} = this.document.view.state
            const boundaryRect = this.document.view.getContainerBoundingRect()!
            const blockUnitRect = this.document.view.getBoundingRectOfBlock(lastMouseEnteredBlock()!)

            return outsideDocBoundary ? {
                position: 'fixed',
                top: blockUnitRect.top
            } : {
                // plugin container 确保了自己是相对于 container 定位的，所以这里可以用 absolute。
                position: 'absolute',
                top: blockUnitRect.top - boundaryRect.top
            }
        }

        public hover = atom(false)

        render(outsideDocBoundary: boolean) {
            const {lastMouseEnteredBlock, lastActiveDeviceType} = this.document.view.state

            const style = () => {
                // range 看不见了，display 要 none
                if (!this.hover() && (!lastMouseEnteredBlock() || lastActiveDeviceType() !== 'mouse')) return {display: 'none'}
                // if (!hover() &&( !lastMouseEnteredBlock())) return { display: 'none'}

                const positionAttrs = this.calculatePosition(outsideDocBoundary)

                return {
                    display: 'block',
                    ...positionAttrs,
                    right: 'calc(100% + 10px)',
                    marginTop: -10,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border: '1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all',
                    whiteSpace: 'nowrap',
                }
            }

            const widgetContainerStyle = () => {
                console.log(111, this.hover())
                return ({
                    display: this.hover() ? 'block' : 'none'
                })
            }

            const iconStyle = () => ({
                display: this.hover() ? 'none' : 'flex',
            })

            return <div style={style} onmouseenter={() => this.hover(true)} onmouseleave={() => this.hover(false)}>
                <div style={iconStyle}>
                    {<Menu size={16}/>}
                </div>
                {/*{() => { this.hover() ? this.items.map(item => item.render()) : null }}*/}
                <div style={widgetContainerStyle}>
                    {this.items.map(item => item.render())}
                </div>
            </div>
        }
    }
}


export class BlockToolWidget {
    constructor(public document: Document, public blockTool: BlockToolPlugin) {
    }

    render(): any {
        return null
    }
}


export function createInsertWidget(InsertHandle: any, widgetName: string = 'BlockTool') {
    return class InsertWidget extends BlockToolWidget {
        public static displayName = `Insert${widgetName}Widget`
        insert = (initialData:BlockData) => {
            this.document.history.openPacket(this.document.view.state.selectionRange())
            const {lastMouseEnteredBlock} = this.document.view.state
            const Block = this.document.content.createFromData(initialData)
            this.document.view.replace(Block, lastMouseEnteredBlock()!, this.document.content)
            this.document.history.closePacket(null)
        }

        render() {
            const {lastMouseEnteredBlock, lastActiveDeviceType} = this.document.view.state
            return () => {
                if (lastActiveDeviceType() ==='mouse' && lastMouseEnteredBlock() instanceof Paragraph && (lastMouseEnteredBlock() as Paragraph)!.isEmpty) {
                    return <div style={{padding:'6px 0'}}>
                        <InsertHandle insert={this.insert}/>
                    </div>
                }
                return null
            }
        }
    }
}

export const ImageInsertWidget = createInsertWidget(ImageInsertHandle, 'Image')
export const GridInsertWidget = createInsertWidget(GridInsertHandle, 'Grid')
export const CodeInsertWidget = createInsertWidget(CodeInsertHandle, 'Code')

// TODO 复制、剪切、删除
export class DeleteWidget extends BlockToolWidget {
    public static displayName = `DeleteBlockWidget`
    deleteBlock = () => {
        const range = this.document.view.state.selectionRange()
        this.document.history.openPacket(range)
        const {lastMouseEnteredBlock} = this.document.view.state
        this.document.view.deleteBetween(lastMouseEnteredBlock()!, lastMouseEnteredBlock()!.next, this.document.content)
        this.document.history.closePacket(range?.startBlock === lastMouseEnteredBlock()  ? null : range)
    }
    render() {
        const {lastMouseEnteredBlock, lastActiveDeviceType} = this.document.view.state
        return () => {
            if (lastActiveDeviceType() ==='mouse' && !(lastMouseEnteredBlock() instanceof Paragraph && (lastMouseEnteredBlock() as Paragraph)!.isEmpty)) {
                return <div style={{padding:'6px 0'}}>
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                        onClick={this.deleteBlock}
                    >
                        <Delete size={18}/>
                        <span style={{marginLeft: 8, fontSize: 14, whiteSpace: 'nowrap'}}>Delete</span>
                    </div>
                </div>
            }
            return null
        }
    }
}

export class CopyWidget extends BlockToolWidget {
    public static displayName = `CopyBlockWidget`
    copyBlock = () => {
        const {lastMouseEnteredBlock} = this.document.view.state
        this.document.clipboard.setData('application/json', [lastMouseEnteredBlock()!.toJSON()])
        if ((lastMouseEnteredBlock() as TextBasedBlock).toText) {
            this.document.clipboard.setData('text/plain', (lastMouseEnteredBlock() as TextBasedBlock).toText())
        }
    }
    render() {
        const {lastMouseEnteredBlock, lastActiveDeviceType} = this.document.view.state
        return () => {
            if (lastActiveDeviceType() ==='mouse' && !(lastMouseEnteredBlock() instanceof Paragraph && (lastMouseEnteredBlock() as Paragraph)!.isEmpty)) {
                return <div style={{padding:'6px 0'}}>
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                        onClick={this.copyBlock}
                    >
                        <Copy size={18}/>
                        <span style={{marginLeft: 8, fontSize: 14, whiteSpace: 'nowrap'}}>Copy</span>
                    </div>
                </div>
            }
            return null
        }
    }
}

export class CutWidget extends BlockToolWidget {
    public static displayName = `CutBlockWidget`
    cutBlock = () => {
        const range = this.document.view.state.selectionRange()
        this.document.history.openPacket(range)
        const {lastMouseEnteredBlock} = this.document.view.state
        const cutBlock = lastMouseEnteredBlock()!
        this.document.view.deleteBetween(lastMouseEnteredBlock()!, lastMouseEnteredBlock()!.next, this.document.content)

        this.document.clipboard.setData('application/json', [cutBlock.toJSON()])
        if ((cutBlock as TextBasedBlock).toText) {
            this.document.clipboard.setData('text/plain', (cutBlock as TextBasedBlock).toText())
        }
        this.document.history.closePacket(range?.startBlock === cutBlock ? null : range)
    }
    render() {
        const {lastMouseEnteredBlock, lastActiveDeviceType} = this.document.view.state
        return () => {
            if (lastActiveDeviceType() ==='mouse' && !(lastMouseEnteredBlock() instanceof Paragraph && (lastMouseEnteredBlock() as Paragraph)!.isEmpty)) {
                return <div style={{padding:'6px 0'}}>
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                        onClick={this.cutBlock}
                    >
                        <Cut size={18}/>
                        <span style={{marginLeft: 8, fontSize: 14, whiteSpace: 'nowrap'}}>Cut</span>
                    </div>
                </div>
            }
            return null
        }
    }
}

// TODO Block 自己的配置 menu


export const defaultBlockWidgets = [DeleteWidget, CopyWidget, CutWidget, ImageInsertWidget, GridInsertWidget, CodeInsertWidget]





