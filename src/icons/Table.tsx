/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
import {SVGProps} from "./type.js";
export default function({ size }:SVGProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#000" stroke-width="4">
                <path d="M39.3 6H8.7C7.20883 6 6 7.20883 6 8.7V39.3C6 40.7912 7.20883 42 8.7 42H39.3C40.7912 42 42 40.7912 42 39.3V8.7C42 7.20883 40.7912 6 39.3 6Z"/>
                <path stroke-linecap="round" d="M18 6V42"/>
                <path stroke-linecap="round" d="M30 6V42"/>
                <path stroke-linecap="round" d="M6 18H42"/>
                <path stroke-linecap="round" d="M6 30H42"/>
            </g>
        </svg>
    )
}

