/**@jsx createElement*/
import {atom, createElement} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
import {Paragraph} from "../DocumentContent.js";
import {ImageBlock} from "../components/Image.js";

class BlockToolPlugin extends Plugin{
    public static displayName = `BlockTool`
    public items: BlockToolWidget[] = []
}

export function createBlockTool(BlockToolWidgets: Array<typeof BlockToolWidget>){
    return class OneBlockToolPlugin extends BlockToolPlugin{
        constructor(doc:Document) {
            super(doc);
            this.items = BlockToolWidgets.map(Item => new Item(doc, this))
        }
        calculatePosition(outsideDocBoundary: boolean) {
            const { lastMouseEnteredBlock } = this.document.view.state
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
        render(outsideDocBoundary: boolean) {
            const hover = atom(false)
            const { lastMouseEnteredBlock, lastActiveDeviceType } = this.document.view.state

            const style = () => {
                // range 看不见了，display 要 none
                if (!hover() &&( !lastMouseEnteredBlock() || lastActiveDeviceType() !== 'mouse')) return { display: 'none'}
                // if (!hover() &&( !lastMouseEnteredBlock())) return { display: 'none'}

                const positionAttrs = this.calculatePosition(outsideDocBoundary)

                return {
                    display: 'block',
                    ...positionAttrs,
                    right: '100%',
                    marginRight: 10,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border:'1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all',
                    whiteSpace: 'nowrap'
                }
            }

            return  <div style={style} onmouseenter={() => hover(true)} onmouseleave={hover(false)}>
                {this.items.map(item => item.render())}
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

export class InsertWidget extends BlockToolWidget {
    public static displayName = `InsertBlockToolItem`
    insertImage = () => {
        this.document.history.openPacket(this.document.view.state.selectionRange())
        const { lastMouseEnteredBlock } = this.document.view.state
        const newImageBlock = new ImageBlock({ src: '', isNew:true })
        this.document.view.replace(newImageBlock, lastMouseEnteredBlock()!, this.document.content)
        this.document.history.closePacket(null)
    }
    renderInsertImage() {
        return <div onClick={this.insertImage}>Insert Image</div>
    }
    renderInsertFile() {

    }
    render() {
        const { lastMouseEnteredBlock, lastActiveDeviceType } = this.document.view.state

        return () => {

            if (lastMouseEnteredBlock() instanceof Paragraph && (lastMouseEnteredBlock() as Paragraph)!.isEmpty) {
                return <div>
                    {this.renderInsertImage()}
                    {this.renderInsertFile()}
                </div>
            }

            return null
        }
    }
}





