import {buildReactiveView, waitUpdate} from "../src/buildReactiveView";
import {buildModelFromData} from "../src/editing";

// const { result: doc, firstLeaf, lastLeaf } = buildModelFromData({
//     type: 'Para',
//     content: [
//         {type: 'Text', value: '11'},
//         {type: 'Text', value: '22'},
//         {type: 'Text', value: '33'}
//     ]
// })
//
// doc.firstLeaf = firstLeaf
// doc.lastLeaf = lastLeaf
// const docElement = buildReactiveView(doc)
// document.getElementById('root').appendChild(docElement)
//
//
// insertContentNodeAfter({type:'Text', value:'44'}, doc.content.head.next.next.node)
//
// for(let i of doc.content) {
//     console.log(i.value.value)
// }
// console.log("222222222")
// setTimeout(() => {
//     insertContentNodeAfter({type:'Text', value:'555'}, doc.content.head.next.next.next.node)
//     for(let i of doc.content) {
//         console.log(i.value.value)
//     }
// }, 1)


describe('basic render', () => {
    test('render Para', () => {
        const { result: doc } = buildModelFromData({
            type: 'Para',
            content: [
                {type: 'Text', value: '11'},
                {type: 'Text', value: '22'},
                {type: 'Text', value: '33'}
            ]
        })

        const docElement = buildReactiveView(doc)
        expect(docElement.textContent).toBe('112233')
    })

    test('render Section', async () => {
        const { result: doc } = buildModelFromData({
            type: 'Section',
            content: [{type: 'Text', value: 'title'}],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: '11'},
                    {type: 'Text', value: '22'},
                    {type: 'Text', value: '33'}
                ]
            }, {
                type: 'Para',
                content: [
                    {type: 'Text', value: '44'},
                    {type: 'Text', value: '55'},
                    {type: 'Text', value: '66'}
                ]
            }]
        })

        const docElement = buildReactiveView(doc)
        await waitUpdate()
        expect(docElement.textContent).toBe('title112233445566')
    })

    test('render Section in Section', async () => {
        const { result: doc } = buildModelFromData({
            type: 'Section',
            content: [{type: 'Text', value: 'title'}],
            children: [{
                type: 'Para',
                content: [
                    {type: 'Text', value: '1'},
                    {type: 'Text', value: '2'},
                    {type: 'Text', value: '3'}
                ]
            }, {
                type: 'Section',
                content: [{type: 'Text', value: 'title2'}],
                children: [{
                    type: 'Para',
                    content: [
                        {type: 'Text', value: '11'},
                        {type: 'Text', value: '22'},
                        {type: 'Text', value: '33'}
                    ]
                }, {
                    type: 'Para',
                    content: [
                        {type: 'Text', value: '44'},
                        {type: 'Text', value: '55'},
                        {type: 'Text', value: '66'}
                    ]
                }]
            }]
        })

        const docElement = buildReactiveView(doc)
        await waitUpdate()
        expect(docElement.textContent).toBe('title123title2112233445566')
    })
})

export {}