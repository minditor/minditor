/**@jsx createElement*/
import {createElement} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
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
                const {visibleRangeRect, lastMouseUpPositionAfterRangeChange, hasRange} = this.document.view.state
                if (!lastMouseUpPositionAfterRangeChange() ) {
                    return {display: 'none'}
                }

                const boundaryRect = this.document.view.getContainerBoundingRect()!

                // 根据最后鼠标停的位置，来决定浮层的位置
                // 1. 如果鼠标位置在 rect 下面，那么浮层就显示在  range 下面
                // 2. 如果鼠标位置在 rect 上面，那么浮层就显示在  range 上面
                const positionAttrs = {} as any
                if (lastMouseUpPositionAfterRangeChange()!.top > (visibleRangeRect.raw!.top + visibleRangeRect.raw!.height / 2)) {
                    positionAttrs.top = visibleRangeRect.raw!.top + visibleRangeRect.raw!.height - boundaryRect.top
                    positionAttrs.bottom = undefined // CAUTION 不能忽略，不然不会清空上一次的值
                } else {
                    positionAttrs.top = undefined // CAUTION 不能忽略，不然不会清空上一次的值
                    positionAttrs.bottom = -(visibleRangeRect.raw!.top - boundaryRect.top)
                }

                // TODO 没考虑 left 超出左右边界的问题。

                return {
                    display: 'block',
                    position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                    ...positionAttrs,
                    transform: 'translateX(-50%)',
                    left: lastMouseUpPositionAfterRangeChange()!.left - boundaryRect.left,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border: '1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all',
                    // 一定要设置，不然在 chrome 上好像有 bug
                    height: 'fit-content',
                }
            }

            // CAUTION 特别注意这里的 stopPropagation，不然会影响到 document 的 mouseup 等事件
            return <div style={style}>
                <div>
                    {() => this.rangeWidgets.map((widget: RangeWidget) => {
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
                    <span style={{cursor: 'pointer'}}
                          onClick={(e:MouseEvent) => this.toggleFormat(formatName)}
                    >{icon}
                    </span>
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



