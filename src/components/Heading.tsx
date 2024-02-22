import {Atom, atom, computed, createElement, createRoot, destroyComputed, reactive} from "axii";
import {Block, DocumentContent, Text, TextBasedBlock} from "../DocumentContent.js";
import {AxiiComponent} from "../AxiiComponent.js";


type HeadingData = {
    level: number,
    useIndex?: boolean,
    manualIndex?: number[],
}

export class Heading extends AxiiComponent {
    static displayName = 'Heading'

    static unwrap(doc: DocumentContent, block: Block) {
        const heading = block as Heading
        const fragment = doc.deleteBetween(heading.firstChild!, null, heading)
        const newPara = doc.createParagraph(fragment)
        doc.replace(newPara, heading)
        return newPara
    }
    public level: Atom<number>
    public useIndex: Atom<boolean>
    public index: number[]
    public manualIndex?: number[]
    public displayIndex: Atom<string>
    public indexRoot?: ReturnType<typeof createRoot>
    constructor(public data: HeadingData) {
        super();
        this.useIndex = atom(data.useIndex||false)
        this.manualIndex = data.manualIndex? reactive([...data.manualIndex]) : undefined
        this.level = atom(data.level||0)
        this.index = computed(() => {
            if (!this.useIndex()) return []

            if (this.manualIndex) {
                return this.manualIndex
            }

            let sameTypePrevBlock: Block | null = this.prev()
            while (sameTypePrevBlock) {
                if (sameTypePrevBlock instanceof Heading) {
                    break
                }
                sameTypePrevBlock = sameTypePrevBlock.prev()
            }

            if (sameTypePrevBlock) {
                const prevIndexData = (sameTypePrevBlock as Heading).index

                const prefix = prevIndexData.slice(0, this.level())
                const lastSameLevelIndex = prevIndexData[this.level()] ??  -1
                return [...prefix, lastSameLevelIndex + 1]

            } else {
                return (new Array(this.level()+1)).fill(0)
            }
        })

        this.displayIndex = computed(() => {
            if (this.useIndex()) {
                return this.index.map(i => i+1).join('.')
            } else {
                return ''
            }
        })
    }
    destroy() {
        destroyComputed(this.index)
        destroyComputed(this.displayIndex)
    }

    renderInner({children}: { children: any }) {
        const Tag = `h${this.level()+1}`

        const result =  <Tag>
            {() => this.displayIndex() ? <span style={{marginRight:8}}>{this.displayIndex()}</span> : null}
            <span contenteditable={true}>{children}</span>
        </Tag> as HTMLElement

        result.contentEditable = 'false'
        return result
    }

    toJSON(): any {
        const baseData = super.toJSON()
        return {
            ...baseData,
            level: this.level(),
            useIndex: this.useIndex(),
            manualIndex: this.manualIndex
        }
    }
    toText() {
        let content = ''
        let current = this.firstChild
        while (current) {
            if (current instanceof Text) {
                content += current.data.value
            } else if( (current as Text).toText ){
                content += (current as Text).toText()
            } else {
                // 忽略不能 toText 的
            }
            current = current.next
        }
        return content
    }
}