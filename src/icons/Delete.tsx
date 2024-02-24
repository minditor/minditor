/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }: SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 15H40L37 44H11L8 15Z" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round"/><path d="M20.002 25.0024V35.0026" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M28.0024 24.9995V34.9972" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M12 14.9999L28.3242 3L36 15" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    )
}

