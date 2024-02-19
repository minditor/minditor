/**@jsx createElement*/
import {onESCKey, createElement, atom, Atom, atomComputed, destroyComputed} from 'axii'
import {Plugin, PluginRunArgv} from "../Plugin";
import {Document} from "../Document";
import Image from "../icons/Image";
import Code from "../icons/Code";
import Table from "../icons/Table";
import List from "../icons/List";
import Link from "../icons/Link";
import {InlineComponent, Component} from "../DocumentContent.js";
import { Code as CodeBlock } from "../components/CodeMirror.js";
import { ImageBlock  } from "../components/Image.js";
import { Link as LinkInline  } from "../components/Link.js";


function onInputKey(key: string) {
    return (e: unknown): boolean => {
        return (e as CustomEvent)?.detail === key
    }
}

function justAfterChar( handle: (...args:any[]) => boolean) {
    return function(this: Plugin, e: unknown) {
        const range = this.document.view.state.selectionRange()!
        return handle(e) && (!range.startText.prev() && range.startOffset === 1 )
    }
}

export class SuggestionWidget {
    constructor(public document: Document, public parent: SuggestionTool) {}
    static isBlock = true
    // render icon。上面可以自定义 click 事件
    render(): JSX.Element {
        return <span>icon</span>
    }
    insertItem() {}
}


class SuggestionTool extends Plugin {
    public static displayName = `SuggestionTool`
    public blockWidgets: SuggestionWidget[] = []
    public inlineWidgets: SuggestionWidget[] = []
    public static deactivateEvents = {
        // TODO 增加更多判断，例如按退格一直把 / 也删掉了。
        keydown: onESCKey(() => true)
    }
    public selectedIndex = atom(-1)
    public removeListenerHandle: () => void = () => {}
    public isAtParaHead: Atom<boolean> = atom(false)
    public availableWidgets: Atom<SuggestionWidget[]> = atom([])
    public selectedWidget: Atom<SuggestionWidget|undefined> = atom(undefined)
}

export function createSuggestionTool(triggerChar: string,  SuggestionClasses: (typeof SuggestionWidget)[]) {

    return class OneSuggestionTool extends SuggestionTool{
        public static displayName = `SuggestionTool(${triggerChar})`
        public static activateEvents = {
            inputChar: onInputKey(triggerChar)
        }
        constructor(public document: Document) {
            super(document);
            const widgets = SuggestionClasses.map(SuggestionClass => {
                return new SuggestionClass(this.document, this)
            })

            this.blockWidgets = widgets.filter(w => (w.constructor as typeof SuggestionWidget).isBlock)
            this.inlineWidgets = widgets.filter(w => !(w.constructor as typeof SuggestionWidget).isBlock)

            this.isAtParaHead = atomComputed(() => {
                const range = this.document.view.state.selectionRange()!
                return !range?.startText.prev() && range?.startOffset === 1
            })

            this.availableWidgets = atomComputed(() => {
              return this.isAtParaHead() ? this.blockWidgets.concat(this.inlineWidgets) : this.inlineWidgets
            })

            this.selectedWidget = atomComputed(() => {
              return this.availableWidgets()[this.selectedIndex()]
            })

            this.removeListenerHandle = this.document.view.listen('keydown', (e: KeyboardEvent) => {
                if (this.activated()) {
                    if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        this.selectedIndex(Math.max(this.selectedIndex() - 1, -1))
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        this.selectedIndex(Math.min(this.selectedIndex() + 1, this.availableWidgets().length -1))
                    } else  if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        if (this.selectedWidget()) {
                            this.selectedWidget()!.insertItem()
                        }
                    }
                }

            }, true)
        }
        onDeactivated() {
            this.selectedIndex(-1)
        }

        destroy() {
            super.destroy();
            this.removeListenerHandle()
            destroyComputed(this.isAtParaHead)
            destroyComputed(this.availableWidgets)
            destroyComputed(this.selectedWidget)
        }

        render() {
            const style = () => {
                // range 看不见了，display 要 none
                const { visibleRangeRect } = this.document.view.state

                if (!this.activated() ) return { display: 'none'}
                const boundaryRect = this.document.view.getContainerBoundingRect()!

                return {
                    display: 'block',
                    position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                    // top: visibleRangeRect().top - boundaryRect.top + boundaryContainer!.scrollTop -50,
                    top: visibleRangeRect!.raw!.top + visibleRangeRect!.raw!.height -boundaryRect.top +1,
                    left: visibleRangeRect!.raw!.left- boundaryRect.left,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border:'1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all'
                }
            }

            const blockGroupStyle = () => {
                return {
                    display: this.isAtParaHead() ? 'block' : 'none'
                }
            }

            return  <div style={style}>
                <div style={blockGroupStyle}>
                    {this.blockWidgets.filter(w => (w.constructor as typeof SuggestionWidget).isBlock).map((widget: SuggestionWidget) => {
                        return widget.render()
                    })}
                </div>
                <div>
                    {this.inlineWidgets.filter(w => !(w.constructor as typeof SuggestionWidget).isBlock).map((widget: SuggestionWidget) => {
                        return widget.render()
                    })}
                </div>
            </div>
        }
    }
}


// TODO 好像还需要增加初始化的参数，有的组件需要。
export function createSuggestionWidget(icon: JSX.Element, Comp: typeof InlineComponent| typeof Component, isBlock = true) : typeof SuggestionWidget{
    return class OneSuggestionWidget extends SuggestionWidget {
        static displayName =`${Comp.displayName}RangeWidget`
        static isBlock = isBlock
        insertItem = () =>{
            this.parent.deactivate()
            console.log('insert', Comp.displayName)
            const range = this.document.view.state.selectionRange()!
            const { startText, startBlock } = range

            this.document.history.openPacket(range)
            const newComp = new Comp({})

            if (newComp instanceof InlineComponent) {
                const lastSlashIndex = startText.data.value.lastIndexOf('/')
                if (lastSlashIndex > -1) {
                    this.document.content.updateText( startText.data.value.slice(0, lastSlashIndex), startText)
                }
                this.document.view.append(newComp, startText, startBlock)
            } else {
                this.document.view.replace(newComp, startBlock, this.document.content)
            }

            this.document.history.closePacket(null)
            newComp.focus()
        }
        render() {
            const style = () => {
                return {
                    cursor: 'pointer',
                    display:'flex',
                    alignItems: 'center',
                    width:24,
                    height:24,
                    justifyContent: 'center',
                    borderRadius:4,
                    background: this.parent.selectedWidget() === this ? '#f0f0f0' : 'transparent'
                }
            }


            return (
                <div
                    style={style}
                    onClick={this.insertItem}
                >
                    {icon}
                </div>
            )
        }
    }
}

export const defaultSuggestionWidgets = [
    createSuggestionWidget(<Code size={16}/>, CodeBlock),
    createSuggestionWidget(<Image size={16}/>, ImageBlock),
    createSuggestionWidget(<Link size={16}/>, LinkInline, false),

]

