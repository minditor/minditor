
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

        // toMatch 遍历完了，说明是完整匹配了
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
    if (endSkipped === false) return false // end 都没有match 成功
    return reversMatchStr(str.slice(0,  -(endStr.length + endSkipped.length)), startStr)

}