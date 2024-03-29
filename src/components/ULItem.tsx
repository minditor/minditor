import {Atom, atom, createElement, createRoot, Fragment} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";
import {AxiiTextBasedComponent} from "../AxiiComponent.js";

type IndexData = {
    level: number,
    manualIndex?: number[],
}

export const LIST_DOTS = ['•', '◦', '▪', '▫', '⦿', '⦾']

export class ULItem extends AxiiTextBasedComponent {
    static displayName = 'ULItem'

    static unwrap(doc: DocumentContent, block:Block) {
        const ulItem = block as ULItem
        if (ulItem.level() === 0) {
            const fragment = doc.deleteBetween(ulItem.firstChild!, null, ulItem)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, ulItem)
            return newPara
        } else {
            ulItem.level(ulItem.level() - 1)
        }
    }
    static wrap(doc: DocumentContent, block:Block) {
        // 要判断上一节点的  level 是否允许自己继续加深
        const prevBlock = block.prev()
        const maxLevel = prevBlock instanceof ULItem ? prevBlock.level() + 1 : 1
        const ulItem = block as ULItem
        if (ulItem.level() < maxLevel) {
            ulItem.level(ulItem.level() + 1)
        }
    }

    static splitAsSameType = true

    static createEmpty(referenceBlock?:ULItem) {
        const newItem = new ULItem({level: referenceBlock?.level() ||0})
        newItem.firstChild = new Text({value: ''})
        return newItem
    }
    public level: Atom<number>
    public indexRoot?: ReturnType<typeof createRoot>
    constructor(public data?: IndexData) {
        super();
        this.level = atom(data?.level||0)
    }
    destroy() {
        this.indexRoot?.destroy()
    }
    renderContainer() {
        return <div style={{display:'flex', alignItems:'baseline'}} contenteditable={true}></div>
    }
    renderInner({children}: { children: any }) {
        const dotStyle = () => {
            return {
                marginRight: 8,
                marginLeft: this.level() * 18,
                userSelect: 'none'
            }
        }
        const contentStyle =  {
            flexGrow:1,
            flexShrink:1,
            flexBasis:'auto',
            wordWrap:'bread-word',
            overflowWrap:'break-word',
            whiteSpace:'normal',
            // CAUTION If minWidth is no set, the content will no change line.
            minWidth:0,
        }
        return <>
            <div style={dotStyle} contenteditable={false}>
                {() => LIST_DOTS[this.level()] ?? LIST_DOTS[0]}
            </div>
            <div contenteditable={true} data-testid='ULItem-editable-container' style={contentStyle} data-content-container={true}>
                {children}
            </div>
        </>
    }
    toJSON() {
        const baseData = super.toJSON()
        return {
            ...baseData,
            level: this.level(),
        }
    }
    toText(): string {
        return `- ${super.toText()}`;
    }
}