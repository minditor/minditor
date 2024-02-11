export const data = {
    type: 'Doc',
    content: [{ type: 'Text', value: 'test title'} ],
    children: [{
        type: 'Paragraph',
        content: [
            {type: 'Text', value: 'p123'},
            {type: 'Text', value: 'p456'},
            {type: 'Text', value: 'p789'}
        ]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 1'} ],
        children: [{
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'}
            ]
        }, {
            type: 'Paragraph',
            content: [
                {type: 'Text', value: 'asdfasdfa'},
                {type: 'Text', value: 's1pasdfasd12345'},
                {type: 'Text', value: 's1pasdfasdf12345'}
            ]
        }]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 2'} ],
        children: [{
            type: 'Section',
            content: [{ type: 'Text', value: 'section 2.1'} ],
            children: [{
                type: 'Paragraph',
                content: [
                    {type: 'Text', value: 's2p12345'},
                    {type: 'Text', value: 's2p12345'},
                    {type: 'Text', value: 's2p12345'}
                ]
            }]
        }]
    }, {
        type: 'ListItem',
        content: [
            {type: 'Text', value: 'focusText'},
            {type: 'Text', value: '222'},
            {type: 'Text', value: '222'}
        ],
        children: [
            {
                type: 'ListItem',
                content: [
                    {type: 'Text', value: '333'},
                    {type: 'Text', value: '3333'},
                    {type: 'Text', value: '333333'}
                ],
                children: [{
                    type: 'ListItem',
                    content: [
                        {type: 'Text', value: '444'},
                        {type: 'Text', value: '4444'},
                        {type: 'Text', value: '444444'}
                    ],
                }, {
                    type: 'ListItem',
                    content: [
                        {type: 'Text', value: '555'},
                        {type: 'Text', value: '5555'},
                        {type: 'Text', value: '55555'}
                    ],
                }]
            },
            {
                type: 'ListItem',
                content: [
                    {type: 'Text', value: '666'},
                    {type: 'Text', value: '6666'},
                    {type: 'Text', value: '66666'}
                ],
                children: [{
                    type: 'ListItem',
                    content: [
                        {type: 'Text', value: '777'},
                        {type: 'Text', value: '777'},
                        {type: 'Text', value: '777'}
                    ],
                }]

            }]
    }, {
        type: 'Code',
        value: `
function test() {
    const a = 1
    let b = 2
}
`
    }]
}

