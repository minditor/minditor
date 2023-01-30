import {Screen} from "@testing-library/dom";
import {NodeType} from "../src/NodeType";
import {GlobalActions, GlobalState} from "../src/globals";

export {};

declare global {
    // 用来扩展 server/index.tsx 中的 pw 对象
    interface Window {
        pw: {
            readonly doc: NodeType
            readonly docElement: HTMLElement|undefined
            screen: Screen,
            state: GlobalState,
            actions: GlobalActions,
        }
    }
}
