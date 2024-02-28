/**@jsx createElement*/
import {Atom, atom, createElement} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
import {Block, EVENT_ANY} from "../DocumentContent.js";
import {idleThrottle} from "../util.js";
import {Heading} from "../components/Heading.js";

class TOCToolPlugin extends Plugin {
    public static displayName = `TOCTool`
}

export type TOCToolConfig = {

}

// type Heading = {
//     level: () => number,
//     toText: () => string,
//     id: string,
//     next: Block|null,
//     prev: () => Block|null,
// }


export function createTOCTool( config?: any) {
    return class OneTOCToolPlugin extends TOCToolPlugin {
        public contents: Atom<Heading[]> = atom([])
        public removeListener!: () => void;
        constructor(document: Document) {
            super(document);
            this.listenEvents()
        }
        listenEvents() {
            const idleUpdate = idleThrottle(this.recomputeContents)
            this.document.content.on(EVENT_ANY, idleUpdate)
            this.removeListener = () => {
                this.document.content.off(EVENT_ANY, idleUpdate)
            }
            this.recomputeContents()
        }
        recomputeContents = () => {
            const newContents: Heading[] = []
            let start: Block|null = this.document.content.firstChild
            while(start) {
                if (start.type === 'Heading') {
                    newContents.push(start as unknown as Heading)
                }
                start = start.next
            }
            this.contents(newContents)
        }
        render(outsideDocBoundary: boolean) {

            const style = () => {
                return {
                    display: 'block',
                    position: 'absolute',
                    right: 'calc(100% + 60px)',
                    height: '100%',// pluginContainer 和 文档高度一样
                    overflowY: 'auto',
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    transition: 'all',
                    whiteSpace: 'nowrap',
                }
            }

            return <div style={style} className="toc-container">
                {() => {
                    return this.contents().map((content, index) => {
                        const style= () => {
                            return {
                                paddingLeft: content.level() * 10,
                            }
                        }
                        const title = content.toText()
                        return <div style={style}>
                            <a href={`#${content.id}`}>{title}</a>
                        </div>
                    })
                }}
            </div>
        }
    }
}





