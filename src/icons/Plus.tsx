/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }: SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24.0605 10L24.0239 38" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 24L38 24" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    )
}

