import {Atom, atom, computed, createElement, createRoot, reactive} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";

type IndexData = {
    level: number,
    manualIndex?: number[],
}

export class OLItem extends Block {
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
        // FIXME 只有 append 之后才知道上一个节点是什么，才能 通知 Index 组件进行计算。这怎么搞？？？
        //  还是要用 atom 来做链接？
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

            if(this.level() === 0) debugger
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

    render({children}: { children: any }) {
        const indexContainer = <span contenteditable={false}></span> as unknown as HTMLElement
        this.indexRoot = createRoot(indexContainer)
        this.indexRoot.render(() => this.displayIndex())
        return <div style={{display:'flex'}}>
            <div>{indexContainer}</div>
            <div>
                {children}
            </div>
        </div>
    }

    toJSON() {
        return {
            type: 'OLItem',
            level: this.level(),
            manualIndex: this.manualIndex
        }
    }
}