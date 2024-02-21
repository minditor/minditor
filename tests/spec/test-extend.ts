import {Screen} from "@testing-library/dom";

export {};

declare global {
    // 用来扩展 server/index.tsx 中的 pw 对象
    interface Window {
        readonly doc: any,
        readonly page: Screen,
        readonly state: any,
        readonly actions: any,
        readonly expectDOMMatch: any,
        readonly expectSelectionMatch: any,
        readonly expectDeepMatch: any,
        readonly expect: any,
        readonly createElement: any,
    }
    var __DEV__: boolean
    namespace JSX {
        interface IntrinsicElements {
            // allow arbitrary elements
            // @ts-ignore suppress ts:2374 = Duplicate string index signature.
            [name: string]: any
        }
        // interface Element extends  ComponentNode {}
    }
}



declare module "@playwright/test" {
    interface Page {
        expect?: any
        expectAll?: any,
        load?: any,
        loadWithPlugin?: any,
        doc?: any,
        selection?:any,
        setSelection?: any,
    }
}
