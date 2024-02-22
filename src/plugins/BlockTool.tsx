/**@jsx createElement*/
import {atom, createElement} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
import {BlockData, Paragraph} from "../DocumentContent.js";
import Menu from "../icons/Menu.js";
import {CodeInsertHandle, GridInsertHandle, ImageInsertHandle} from "./SuggestionTool.js";

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


export function createInsertWidget(InsertHandle: any) {
    return class InsertWidget extends BlockToolWidget {
        public static displayName = `InsertBlockToolItem`
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

export const ImageInsertWidget = createInsertWidget(ImageInsertHandle)
export const GridInsertWidget = createInsertWidget(GridInsertHandle)
export const CodeInsertWidget = createInsertWidget(CodeInsertHandle)

export const defaultBlockWidgets = [ImageInsertWidget, GridInsertWidget, CodeInsertWidget]

// TODO 复制、剪切、删除
// TODO Block 自己的配置 menu



