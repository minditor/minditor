import {Atom, atom, computed, createElement, createRoot, destroyComputed, reactive} from "axii";
import {Block, DocumentContent, Text, TextBasedBlock} from "../DocumentContent.js";

type IndexData = {
    level: number,
    manualIndex?: number[],
}

export class OLItem extends TextBasedBlock {
    static displayName = 'OLItem'

    static unwrap(doc: DocumentContent, block:Block) {
        const olItem = block as OLItem
        if (olItem.data.level === 0) {
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, olItem)
            return newPara
        } else {
            const fragment = doc.deleteBetween(olItem.firstChild!, null, olItem)
            const newOlItem = new OLItem({level: olItem.data.level - 1})
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
    render({children}: { children: any }) {
        const indexContainer = <span></span>  as HTMLElement
        this.indexRoot = createRoot(indexContainer)
        this.indexRoot.render(() => this.displayIndex())
        return <div style={{display:'flex'}} contenteditable={false}>
            <div>{indexContainer}</div>
            <div contenteditable={true}>
                {children}
            </div>
        </div>
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