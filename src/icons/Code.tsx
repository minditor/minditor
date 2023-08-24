/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
export default function({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#000" stroke-linecap="round" stroke-width="4">
                <path stroke-linejoin="round" d="M16 13L4 25.4322L16 37"/>
                <path stroke-linejoin="round" d="M32 13L44 25.4322L32 37"/>
                <path d="M28 4L21 44"/>
            </g>
        </svg>
    )
}

