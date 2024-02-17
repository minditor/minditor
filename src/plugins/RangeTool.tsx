/**@jsx createElement*/
import {onESCKey, createElement, createHost} from 'axii'
import {Plugin, PluginRunArgv} from "../Plugin";
import {Document} from "../Document";
import Bold from "../icons/Bold";
import Italic from "../icons/Italic";
import Underline from "../icons/Underline";
import Linethrough from "../icons/Linethrough";


export class RangeWidget {
    constructor(public document: Document) {
    }

    // render icon。上面可以自定义 click 事件
    render(): JSX.Element {
        return <span>icon</span>
    }
}

class RangeTool extends Plugin {
    public rangeWidgets: RangeWidget[] = []
}


export function createRangeTool(RangeWidgets: (typeof RangeWidget)[]) {

    return class OneRangeTool extends RangeTool {
        public rangeWidgets: RangeWidget[]

        constructor(public document: Document) {
            super(document);
            this.rangeWidgets = RangeWidgets.map(RangeWidgetClass => {
                return new RangeWidgetClass(this.document)
            })
        }

        render() {
            const style = () => {
                const {visibleRangeRect, lastUsedDevice, selectionRange} = this.document.view.state
                if (lastUsedDevice()?.type !== 'mouse' || !selectionRange() || selectionRange()?.isCollapsed || !visibleRangeRect()) {
                    return {display: 'none'}
                }

                const boundaryRect = this.document.view.getContainerBoundingRect()!

                // 根据最后鼠标停的位置，来决定浮层的位置
                // 1. 如果鼠标位置在 rect 下面，那么浮层就显示在  range 下面
                // 2. 如果鼠标位置在 rect 上面，那么浮层就显示在  range 上面
                const positionAttrs = {} as any
                if (lastUsedDevice()!.top > (visibleRangeRect()!.top + visibleRangeRect()!.height / 2)) {
                    positionAttrs.top = visibleRangeRect()!.top + visibleRangeRect()!.height - boundaryRect.top
                } else {
                    positionAttrs.bottom = -(visibleRangeRect()!.top - boundaryRect.top)
                }

                return {
                    display: 'block',
                    position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                    bottom: -(visibleRangeRect()!.top - boundaryRect.top),
                    transform: 'translateX(-50%)',
                    left: lastUsedDevice()!.left - boundaryRect.left,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border: '1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all'
                }
            }

            return <div style={style}>
                <div>
                    {this.rangeWidgets.map((widget: RangeWidget) => {
                        return widget.render()
                    })}
                </div>
                <div>{() => this.document.view.state.mousePosition() && JSON.stringify(this.document.view.state.mousePosition())}</div>
            </div>
        }
    }
}

class FormatWidget extends RangeWidget {
    static displayName = `FormatRangeWidget`
    static formatAndIcons: [any, string][] = [
        [<Bold size={16}/>, 'bold'],
        [<Italic size={16}/>, 'italic'],
        [<Underline size={16}/>, 'underline'],
        [<Linethrough size={16}/>, 'lineThrough'],
    ]
    toggleFormat = (formatName: string) => {
        // TODO 获取原来的 format。展示到  icon 上
        this.document.view.formatCurrentRange({[formatName]: true})
    }

    render() {
        return <span>
            {
                FormatWidget.formatAndIcons.map(([icon, formatName]) => (
                    <span style={{cursor: 'pointer'}} onClick={() => this.toggleFormat(formatName)}>{icon}</span>
                ))
            }
        </span>
    }
}

// TODO 字体颜色
// TODO 背景颜色

export const defaultFormatWidgets = [
    FormatWidget
]



