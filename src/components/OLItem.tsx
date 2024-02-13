import {createElement} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";

export class OLItem extends Block {
    static displayName = 'OLItem'

    static unwrap(doc: DocumentContent, olItem: OLItem) {
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

    render({children}: { children: any }) {
        return <div>{children}</div>
    }

    toJSON() {
        return {
            type: 'OLItem',
            level: this.data.level
        }
    }
}