import {Screen} from "@testing-library/dom";
import { Page } from '@playwright/test';
import {expectSelectionMatch} from "./server/util";

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
}



declare module "@playwright/test" {
    interface Page {
        expect?: any
        expectAll?: any,
        load?: any,
        doc?: any,
        selection?:any,
        setSelection?: any,
    }
}
