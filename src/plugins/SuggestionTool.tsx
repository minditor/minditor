/**@jsx createElement*/
import {atom, Atom, atomComputed, createElement, destroyComputed, onESCKey} from 'axii'
import {Plugin} from "../Plugin";
import {Document} from "../Document";
import Image from "../icons/Image";
import Code from "../icons/Code";
import Link from "../icons/Link";
import Grid from "../icons/Grid";
import Right from "../icons/Right.js";
import {BlockData, Component, InlineComponent, InlineData} from "../DocumentContent.js";
import {GridPicker} from '../components/Grid.js'
import {CodeLanguagePicker, Code as CodeBlock} from "../components/CodeMirror.js";


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
    insertItem(initialData?: InlineData|BlockData) {}
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
    public shouldShowBelow!: Atom<boolean>
}

export type CreateSuggestionToolConfig  = {
    triggerChar: string
}
export function createSuggestionTool(SuggestionClasses: typeof SuggestionWidget[], config?: CreateSuggestionToolConfig) {
    const { triggerChar} = config || {
        triggerChar: '/'
    }
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

            this.shouldShowBelow = atomComputed(() => {
                const { visibleRangeRect, bodyViewPortSize } = this.document.view.state
                return visibleRangeRect() ? visibleRangeRect()!.top < bodyViewPortSize().height / 2 : false
            })

            this.removeListenerHandle = this.document.view.listen('keydown', (e: KeyboardEvent) => {
                if (this.activated()) {
                    if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        this.selectedIndex(Math.max(this.selectedIndex() - 1, -1))
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        this.selectedIndex(Math.min(this.selectedIndex() + 1, this.availableWidgets().length ))
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
        onActivated() {
            this.selectedIndex(this.shouldShowBelow() ? -1 : this.availableWidgets().length )
        }

        destroy() {
            super.destroy();
            this.removeListenerHandle()
            destroyComputed(this.isAtParaHead)
            destroyComputed(this.availableWidgets)
            destroyComputed(this.selectedWidget)
        }
        calculatePosition(outsideDocBoundary: boolean) {
            const { visibleRangeRect, bodyViewPortSize } = this.document.view.state
            const boundaryRect = this.document.view.getContainerBoundingRect()!

            const shouldShowBelow = this.shouldShowBelow()

            return outsideDocBoundary ? {
                position: 'fixed',
                top: visibleRangeRect!.raw!.top + (shouldShowBelow ? visibleRangeRect!.raw!.height : 0),
                transform: shouldShowBelow ? 'none' :'translateY(-100%)',
                left: visibleRangeRect!.raw!.left,
            } : {
                position: 'absolute',
                top: visibleRangeRect!.raw!.top + (shouldShowBelow ? visibleRangeRect!.raw!.height : 0) -boundaryRect.top +1,
                transform: shouldShowBelow ? 'none' :'translateY(-100%)',
                left: visibleRangeRect!.raw!.left- boundaryRect.left,
            }
        }
        render(outsideDocBoundary: boolean) {
            const style = () => {

                if (!this.activated() ) return { display: 'none'}
                const positionAttrs = this.calculatePosition(outsideDocBoundary)

                return {
                    display: 'block',
                    ...positionAttrs,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border:'1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all',
                    zIndex: 100000

                }
            }

            const blockGroupStyle = () => {
                return {
                    display: this.isAtParaHead() ? 'block' : 'none'
                }
            }

            return  <div
                data-testid='suggestionTool-container'
                style={style}
                onMouseLeave={() => this.selectedWidget(null)}
            >
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


function isSubclassOf(subClass: Function, superClass:Function) {
    // 从当前类的原型开始
    let prototype = Object.getPrototypeOf(subClass.prototype);

    // 沿着原型链向上查找
    while (prototype != null) {
        // 检查当前原型是否是超类的原型
        if (prototype === superClass.prototype) {
            return true;
        }
        // 向上移动到下一个原型
        prototype = Object.getPrototypeOf(prototype);
    }

    // 如果没有找到超类的原型，返回 false
    return false;
}

// TODO 好像还需要增加初始化的参数，有的组件需要。
export function createSuggestionWidget(Handle: JSX.ElementClass, type: string, isBlock: boolean = false) : typeof SuggestionWidget{
    return class OneSuggestionWidget extends SuggestionWidget {
        static displayName =`${type}SuggestionWidget`
        static isBlock = isBlock
        insertItem = (initialData: InlineData|BlockData = {type, content: []}) =>{
            this.parent.deactivate()
            const range = this.document.view.state.selectionRange()!
            const { startText, startBlock } = range

            this.document.history.openPacket(range)
            const newComp = this.document.content.createFromData(initialData) as Component|InlineComponent

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
                    padding: 4,
                    borderRadius:4,
                    background: this.parent.selectedWidget() === this ? '#f0f0f0' : 'transparent'
                }
            }

            return (
                <div
                    style={style}
                    onMouseEnter={() => this.parent.selectedWidget(this)}
                >
                    <Handle insert={this.insertItem} />
                </div>
            )
        }
    }
}




type CommonInsertHandleProps = {
    insert: (initialData: InlineData|BlockData) => void
}

function createCommonInsertHandle(icon: JSX.Element, type: string) {
    return function InsertHandle({insert}: CommonInsertHandleProps) {
        return (
            <div
                data-testid={`suggestionItem-${type}`}
                style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer'}}
                onClick={() => insert({type, content: []})}
            >
                {icon}
                <span style={{marginLeft: 8, fontSize: 14, whiteSpace:'nowrap'}}>+ {type}</span>
            </div>
        )
    }
}

export const ImageInsertHandle = createCommonInsertHandle(<Image size={18}/>, 'Image')
export const LinkInsertHandle = createCommonInsertHandle(<Link size={18}/>, 'Link')


export function GridInsertHandle({insert}: CommonInsertHandleProps) {
    const onGridChange = (size: [number, number]) => {
        const columns = Array.from({length: size[0]}, () => 100)
        const data = Array.from({length: size[1]}, () =>
            columns.map(() => (Document.createEmptyDocumentData()))
        )
        insert({type: 'Grid', columns, data, content: []})
        activated(false)
    }
    const activated = atom(false)

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                width: '100%'
            }}
            onmouseenter={() => activated(true)}
            onmouseleave={() => activated(false)}
        >
            <Grid size={18}/>
            <span style={{marginLeft: 8, fontSize: 14,  whiteSpace:'nowrap'}}>+ Grid</span>
            <Right size={18}/>

            <div style={() => ({
                display: activated() ? 'block' : 'none',
                position: 'absolute',
                left: 'calc(100% - 8px)',
                top: 0,
                transform: 'translateY(-50%)',
                paddingLeft: 18,
                background: 'transparent',
            })}
            >
                <div style={{
                    padding: 10,
                    border: '1px solid #eee',
                    background: '#fff',
                    boxShadow: '2px 2px 5px #dedede'
                }}
                >
                    <GridPicker onChange={onGridChange} size={[10, 10]} unitSize={20}/>
                </div>
            </div>
        </div>
    )
}

export function CodeInsertHandle({insert}: CommonInsertHandleProps) {
    const onGridChange = (lang: string) => {
        insert({type: 'Code', language:lang, value: '', content: []})
        activated(false)
    }
    const activated = atom(false)

    const languages = Object.keys(CodeBlock.langToPlugin)

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                width: '100%'
            }}
            onmouseenter={() => activated(true)}
            onmouseleave={() => activated(false)}
        >
            <Code size={18}/>
            <span style={{marginLeft: 8, fontSize: 14,  whiteSpace:'nowrap'}}>+ Code</span>
            <Right size={18}/>

            <div style={() => ({
                display: activated() ? 'block' : 'none',
                position: 'absolute',
                left: 'calc(100% - 8px)',
                top: 0,
                transform: 'translateY(-50%)',
                paddingLeft: 18,
                background: 'transparent',
            })}
            >
                <div style={{
                    border: '1px solid #eee',
                    background: '#fff',
                    boxShadow: '2px 2px 5px #dedede',
                    maxHeight: 400,
                    overflowY: 'auto'
                }}
                >
                    <CodeLanguagePicker onChange={onGridChange} languages={languages}/>
                </div>
            </div>
        </div>
    )
}

export const defaultSuggestionWidgets = [
    createSuggestionWidget(ImageInsertHandle, 'Image', true),
    createSuggestionWidget(LinkInsertHandle, 'Link', false),
    createSuggestionWidget(GridInsertHandle, 'Grid', true),
    createSuggestionWidget(CodeInsertHandle, 'Code', true),
]