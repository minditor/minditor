import {createElement} from "axii";
import {Block, DocumentContent} from "../DocumentContent.js";

export class Heading extends Block {
    static displayName = 'Heading'

    static unwrap(doc: DocumentContent, heading: Heading) {
        const fragment = doc.deleteBetween(heading.firstChild!, null, heading)
        const newPara = doc.createParagraph(fragment)
        doc.replace(newPara, heading)
        return newPara
    }

    render({children}: { children: any }) {
        return <h1>{children}</h1>
    }
}