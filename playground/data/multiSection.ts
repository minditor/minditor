export const data = {
    type: 'Doc',
    content: [{ type: 'Text', value: 'test title'} ],
    children: [{
        type: 'Para',
        content: [
            {type: 'Text', value: 'p123'},
            {type: 'Text', value: 'p456'},
            {type: 'Text', value: 'p789'}
        ]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 1'} ],
        children: [{
            type: 'Para',
            content: [
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'}
            ]
        }]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 2'} ],
        children: [{
            type: 'Para',
            content: [
                {type: 'Text', value: 's2p12345', props: { formats: { bold: true }}},
                {type: 'Text', value: 's2p12345'},
                {type: 'Text', value: 's2p12345'}
            ]
        }]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 3'} ],
        children: [{
            type: 'Table',
            value: 'test'
        }, {
            type: 'Para',
            content: [
                {type: 'Text', value: '#jsp123'},
                {type: 'Text', value: 'p456'},
                {type: 'Text', value: 'p789'}
            ]
        }]
    }]
}

