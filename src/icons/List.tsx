/* @jsx createElement*/
import {createElementNS as createElement} from "axii";
export default function({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
                <path d="M20 9H42"/>
                <path d="M20 19H42"/>
                <path d="M20 29H42"/>
                <path d="M20 39H42"/>
                <path d="M6 29H12V32L6 38V39H12"/>
                <path d="M7 11L9 9V19M9 19H7M9 19H11"/>
            </g>
        </svg>
    )
}

