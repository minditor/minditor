import {Atom, atom, computed, createElement, createRoot, destroyComputed, Fragment, reactive} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";
import {AxiiTextBasedComponent} from "../AxiiComponent.js";

type IndexData = {
    level: number,
    manualIndex?: number[],
}

export class OLItem extends AxiiTextBasedComponent {
    static displayName = 'OLItem'

    static unwrap(doc: DocumentContent, block:Block) {
        const olItem = block as OLItem
        if (olItem.level() === 0) {
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, olItem)
            return newPara
        } else {
            olItem.level(olItem.level() - 1)
        }
    }
    static wrap(doc: DocumentContent, block:Block) {
        // 要判断上一节点的  level 是否允许自己继续加深
        const prevBlock = block.prev()
        const maxLevel = prevBlock instanceof OLItem ? prevBlock.level() + 1 : 1
        const olItem = block as OLItem
        if (olItem.level() < maxLevel) {
            olItem.level(olItem.level() + 1)
        }
    }

    static splitAsSameType = true

    static createEmpty(referenceBlock?:OLItem) {
        const newItem = new OLItem({level: referenceBlock?.level() ||0})
        newItem.firstChild = new Text({value: ''})
        return newItem
    }
    public level: Atom<number>
    public index: number[]
    public manualIndex?: number[]
    public displayIndex: Atom<string>
    public indexRoot?: ReturnType<typeof createRoot>
    constructor(public data: IndexData) {
        super();

        this.manualIndex = data.manualIndex ? reactive([...data.manualIndex]) : undefined
        this.level = atom(data.level||0)
        this.index = computed(() => {

            if (this.manualIndex) {
                return this.manualIndex
            }

            const sameTypePrevBlock = this.prev() instanceof OLItem ? this.prev() : null

            if (sameTypePrevBlock) {
                const prevIndexData = (sameTypePrevBlock as OLItem).index

                const prefix = prevIndexData.slice(0, this.level())
                const lastSameLevelIndex = prevIndexData[this.level()] ?? -1
                return [...prefix, lastSameLevelIndex + 1]

            } else {
                return (new Array(this.level()+1)).fill(0)
            }
        })

        this.displayIndex = computed(() => {
            return this.index.map(i => i+1).join('.') + '.'
        })
    }
    destroy() {
        destroyComputed(this.index)
        destroyComputed(this.displayIndex)
        this.indexRoot?.destroy()
    }
    renderContainer() {
        return <div style={{display:'flex', alignItems:'baseline'}} contenteditable={false}></div>
    }

    renderInner({children}: { children: any }) {
        const dotStyle = () => {
            return {
                marginRight: 8,
                marginLeft: this.level() * 18,
                flexGrow:0,
                flexShrink:0,
                flexBasis:'auto',
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
            // CAUTION if minWidth is not set, content will not change line.
            minWidth:0
        }
        return <>
            <div style={dotStyle}><span>{this.displayIndex}</span></div>
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
            manualIndex: this.manualIndex
        }
    }
}