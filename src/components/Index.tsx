import {InlineComponent, InlineComponentContext, Block} from "minditor";
/* @jsx createElement */
import {Atom, computed, atom, destroyComputed, createRoot, createElement} from 'axii'


type IndexData = {
    blockType: string,
    level: number,
    manualIndex?: number[],
    consecutive: boolean,
}

// FIXME 这里没有考虑切换 parent block 的问题！
export class Index extends InlineComponent{
    public level: Atom<number>
    public index: Atom<number>[]
    public manualIndex?: Atom<number>[]
    public displayIndex: Atom<string>
    constructor(public data:IndexData, public context: InlineComponentContext) {
        super();
        this.level = atom(data.level||0)
        this.index = computed(() => {
            if (this.manualIndex) {
                return this.manualIndex
            }

            let sameTypePrevBlock: Block | null = null

            if (data.consecutive) {
                sameTypePrevBlock = this.context.block.prev
            } else {
                let block: Block | null = this.context.block.prev
                while (block) {
                    if (block.data.type === data.blockType) {
                        sameTypePrevBlock = block
                        break
                    }
                    block = block.prev
                }
            }


            const prevIndex = sameTypePrevBlock?.firstChild
            if (prevIndex instanceof Index) {
                const prevIndexData = prevIndex?.index

                const prefix = prevIndexData.slice(0, data.level)
                return [...prefix, atom(prevIndexData[this.level()]() + 1)]

            } else {
                return (new Array(this.level()+1)).fill(atom(0))
            }
        })

        this.displayIndex = computed(() => {
          return this.index.map(i => i()+1).join('.')
        })
    }
    destroy() {
        destroyComputed(this.index)
        destroyComputed(this.displayIndex)
    }
    render() {
        const rootElement = <span></span> as HTMLElement
        createRoot(rootElement).render(() => this.displayIndex())
        return rootElement
    }
    toJSON() {
        return {
            type: 'Index',
            blockType: this.data.blockType,
            level: this.level(),
            consecutive: this.data.consecutive,
            manualIndex: this.manualIndex?.map(i => i()),
        }
    }
}
