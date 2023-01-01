export const data = {
    type: 'Doc',
    children: [{
        type: 'List',
        content: [
            {type: 'Text', value: '123'},
            {type: 'Text', value: '456'},
            {type: 'Text', value: '789'}
        ],
        children: [
            {
                type: 'ListItem',
                content: [
                    {type: 'Text', value: '123'},
                    {type: 'Text', value: '456'},
                    {type: 'Text', value: '789'}
                ],
                children: [
                    {
                        type: 'ListItem',
                        content: [
                            {type: 'Text', value: '123'},
                            {type: 'Text', value: '456'},
                            {type: 'Text', value: '789'}
                        ],
                        children: [
                            {
                                type: 'ListItem',
                                content: [
                                    {type: 'Text', value: '123'},
                                    {type: 'Text', value: '456'},
                                    {type: 'Text', value: '789'}
                                ],
                            },
                        ]
                    },
                ]
            },
        ]
    }]
}

