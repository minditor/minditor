import { createElement } from "axii";
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import ImageEditor from '@uppy/image-editor';
import '@uppy/image-editor/dist/style.min.css';
import {Component} from "../DocumentContent.js";


type ImageData = {
    src: string
    isNew?: boolean
    alt?: string
}

export class ImageBlock extends Component {
    static displayName = 'Image'
    public element?: HTMLElement
    constructor(public data: ImageData) {
        super(data);
    }
    onMount = () => {
        console.log(111111)
        if (this.data.isNew) {
            new Uppy()
                .use(Dashboard, { inline: true, target: this.element })
                .use(ImageEditor, { target: Dashboard })
                .on('upload-success', (file, response) => {
                    // console.log(file.name, response.uploadURL);
                    // const img = new Image();
                    // img.width = 300;
                    // img.alt = file.id;
                    // img.src = response.uploadURL;
                    // document.body.appendChild(img);
                    // FIXME 更新自己 block
                });
        }
    }
    render() {
        this.element = (this.data.isNew  ?
            <div></div> :
            <img src={this.data.src} alt={this.data.alt}/>) as unknown as HTMLElement

        return this.element
    }
}
