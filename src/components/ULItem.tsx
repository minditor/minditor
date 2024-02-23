import {Atom, atom, computed, createElement, createRoot, destroyComputed, reactive, Fragment} from "axii";
import {Block, DocumentContent, Text, TextBasedBlock} from "../DocumentContent.js";
import {AxiiComponent, AxiiTextBasedComponent} from "../AxiiComponent.js";

type IndexData = {
    level: number,
    manualIndex?: number[],
}

export const LIST_DOTS = ['•', '◦', '▪', '▫', '⦿', '⦾']

export class ULItem extends AxiiTextBasedComponent {
    static displayName = 'ULItem'

    static unwrap(doc: DocumentContent, block:Block) {
        const olItem = block as ULItem
        if (olItem.level() === 0) {
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, olItem)
            return newPara
        } else {
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newOlItem = new ULItem({level: olItem.level() - 1})
            newOlItem.firstChild = fragment.retrieve()
            doc.replace(newOlItem, olItem)
            return newOlItem
        }
    }

    static splitAsSameType = true

    static createEmpty(level = 0) {
        const newItem = new ULItem({level})
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
        return <div style={{display:'flex'}} contenteditable={false}></div>
    }
    renderInner({children}: { children: any }) {
        const dotStyle = () => {
            return {
                marginRight: 8,
                marginLeft: this.level() * 18,
            }
        }
        const contentStyle =  {
            flexGrow:1,
            flexShrink:1,
            flexBasis:'auto',
            wordWrap:'bread-word',
            overflowWrap:'break-word',
            whiteSpace:'normal',
            // CAUTION 这个是触发换行的关键
            minWidth:0
        }
        return <>
            <div style={dotStyle}>{() => LIST_DOTS[this.level()] ?? LIST_DOTS[0]}</div>
            <div contenteditable={true} data-testid='ULItem-editable-container' style={contentStyle}>
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
}