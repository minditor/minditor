import {Atom, atom, computed, createElement, createRoot, destroyComputed, Fragment, reactive} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";
import {AxiiTextBasedComponent} from "../AxiiComponent.js";
import {HTMLElement} from "happy-dom";

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
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newOlItem = new OLItem({level: olItem.level() - 1})
            newOlItem.firstChild = fragment.retrieve()
            doc.replace(newOlItem, olItem)
            return newOlItem
        }
    }

    static splitAsSameType = true

    static createEmpty(level = 0) {
        const newItem = new OLItem({level})
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
        return <div style={{display:'flex', width:'100%'}} contenteditable={false}></div>
    }

    renderInner({children}: { children: any }) {
        // const indexContainer = <span></span>  as HTMLElement
        // this.indexRoot = createRoot(indexContainer)
        // this.indexRoot.render(() => this.displayIndex())
        // return <div style={{display:'flex'}} contenteditable={false}>
        //     <div>{indexContainer}</div>
        //     <div contenteditable={true}>
        //         {children}
        //     </div>
        // </div>

        const dotStyle = () => {
            return {
                marginRight: 8,
                marginLeft: this.level() * 18,
                flexGrow:0,
                flexShrink:0,
                flexBasis:'auto'
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