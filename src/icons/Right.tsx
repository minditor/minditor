/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }: SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12L31 24L19 36" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    )
}

