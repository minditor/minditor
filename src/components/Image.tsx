import {DocNode, DocNodeData, IsolatedComponent, RenderContext, RenderProps} from "../DocNode";
import { atom } from 'rata'
import {createElement} from 'axii'
import {SuggestionWidget} from "../plugins/SuggestionTool";

export class Image extends IsolatedComponent {
    public value: Atom<string>
    constructor(public data: DocNodeData, parent?: DocNode) {
        super(data, parent);
        this.value = atom(data.value)
    }
    toJSON() {
        return {type: 'Image', value: this.value()}
    }
    render({content}:RenderProps, {createElement}: RenderContext) : HTMLElement{
        return <div style={{maxWidth: "100%"}}>
            <img src={this.value} style={{width: "100%"}}/>
        </div> as unknown as HTMLElement
    }
}

export class ImageSuggestionWidget extends SuggestionWidget {
    static displayName =`ImageSuggestionWidget`
    insertImage = (event: Event) =>{
        const imageFiles = event.target.files;
        const imageFilesLength = imageFiles.length;
        if (imageFilesLength > 0) {
            const imageSrc = URL.createObjectURL(imageFiles[0]);

            const imageDocNode = new Image({type: 'Image', value: imageSrc})
            this.document.content.replaceDocNode(imageDocNode, this.document.view.state.contentRange().startNode)
            this.parent.activated(false)
            // TODO 如果有 nextSibling ，就 focus 上去，如果没有，就创建一个新的 para，然后 focus
            let nextFocus
            if (imageDocNode.nextSiblingInTree) {
                nextFocus = imageDocNode.nextSiblingInTree
            } else {
                nextFocus = new DocNode.ParagraphType!({type: 'Paragraph'})
                this.document.content.appendNextSibling(imageDocNode, nextFocus)
            }
            this.document.view.setCursor(nextFocus, 0)
        }
    }
    render() {
        return <div >
            <input type="file" id="file-upload" accept="image/*" onChange={this.insertImage}/>
        </div>
    }
}
