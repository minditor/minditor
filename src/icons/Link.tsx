/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }: SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M4 6h7v2H4v8h7v2H2V6zm16 0h-7v2h7v8h-7v2h9V6zm-3 5H7v2h10z"/>
        </svg>
    )
}

