import {Block, Inline, Text} from "./DocumentContent.js";

import {DocRange} from "./Range.js";

export function reversMatchStr(str: string, toMatch: string) : false | string {
    if (!toMatch) return ''
    if (str.length < toMatch.length) return false
    if (str.length === toMatch.length) return str === toMatch ? str : false

    const skippedChars = []

    let index = str.length - 1
    while(index > -1) {
        const toMatchLen = toMatch.length
        let i = toMatchLen -1
        while(i > -1) {
            if (str[index - (toMatchLen - i - 1)] !== toMatch[i]) {
                break;
            }
            --i
        }

        // toMatch characters is all tested, that means match
        if (i === -1) {
            return skippedChars.join('')
        } else {
            skippedChars.unshift(str[index])
            index--
        }
    }

    return false
}

export function reverseMatchStrPair(str: string, [startStr, endStr] : [string, string]): false|string {
    const endSkipped = reversMatchStr(str, endStr)
    if (endSkipped === false) return false // end did not match
    return reversMatchStr(str.slice(0,  -(endStr.length + endSkipped.length)), startStr)

}


export function reverseFindMatchRange(inputEndText: Inline, inputEndOffset: number, startChars: string, closeChars: string, block:Block) {
    let endText
    let endOffset
    let endPointer: Inline|null = inputEndText
    while(endPointer) {
        if (endPointer instanceof Text) {
            const textToMatch = endPointer === inputEndText ? endPointer.data.value.slice(0, inputEndOffset) : endPointer.data.value
            const skippedChars = reversMatchStr(textToMatch, closeChars)
            if (skippedChars !== false) {
                endText = endPointer
                endOffset = textToMatch.length - skippedChars.length
                break
            }
        }
        endPointer = endPointer.prev()
    }
    // end did not match, so we can return
    if (!endText) return false

    let startText
    let startOffset
    let startPointer: Inline|null = endText

    while(startPointer) {
        if (startPointer instanceof Text) {
            const textToMatch = startPointer === endText ? startPointer.data.value.slice(0, endOffset! - closeChars.length) : startPointer.data.value
            const skippedChars = reversMatchStr(textToMatch, startChars)
            if (skippedChars !== false) {
                startText = startPointer
                startOffset = textToMatch.length - skippedChars.length - startChars.length
                break
            }
        }
        startPointer = startPointer.prev()
    }
    if (!startText) return false

    return new DocRange(block, startText, startOffset!, block, endText, endOffset!)
}