/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }:SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
                <path d="M20 6H36"/>
                <path d="M12 42H28"/>
                <path d="M29 5.95215L19 41.9998"/>
            </g>
        </svg>
    )
}

