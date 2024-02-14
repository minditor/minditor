import {createElement} from "axii";
import {Block, DocumentContent, Text} from "../DocumentContent.js";

export class ULItem extends Block {
    static displayName = 'ULItem'

    static unwrap(doc: DocumentContent, ulItem: ULItem) {
        if (ulItem.data.level === 0) {
            const fragment = doc.deleteBetween(ulItem.firstChild!, null, ulItem)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, ulItem)
            return newPara
        } else {
            const fragment = doc.deleteBetween(ulItem.firstChild!, null, ulItem)
            const newOlItem = new ULItem({level: ulItem.data.level - 1})
            newOlItem.firstChild = fragment.retrieve()
            doc.replace(newOlItem, ulItem)
            return newOlItem
        }
    }

    static splitAsSameType = true

    static createEmpty(level = 0) {
        const newItem = new ULItem({level})
        newItem.firstChild = new Text({value: ''})
        return newItem
    }

    render({children}: { children: any }) {
        return <div>{children}</div>
    }

    toJSON() {
        return {
            type: 'ULItem',
            level: this.data.level
        }
    }
}