export const data = {
    type: 'Doc',
    content: [{ type: 'Text', value: 'test title'} ],
    children: [{
        type: 'Para',
        content: [
            {type: 'Text', value: `对于所有可以应用默认行为的，在 computed 里面通过 \`patchableUpdate\` 来更新，patchFn 里面识别这个 api，不执行 dom 操作就行了。我们注意到所有可以的情况都是 光标和 range 在一个 span 中的情况。目前可以总结成只要更新的文字跨越了节点，就不行。`}
        ]
    }, {
        type: 'Para',
        content: [
            {type: 'Text', value: `这里有个输入法的细节，就是输入法输入的时候，会出一定的视图和模型不同步的情况。composition start 的时候视图就开始变化了，但我们需要的是 composition end 的时候再更新模型，这样就能把输入法输入也看做是简单的插入操作。
这在有 range 的情况下逻辑不太好写，因为其他的行为都是在“一个事件”中就能去判断好了。而输入法必须在 composition start 的时候就判断会不会对 range 产生影响，因为到 composition end 的时候，range 被删除的默认行为已经执行了。

还有个输入法和选区结合的细节。在选区的结构变化不能使用默认的，那么在我们手动处理完 range 删除后，这会导致光标所在的 dom 节点变化，那么输入法输入的第一个字符还有效吗？
必须得保证 anchor 所在的 dom 节点仍然存在。这就要让我们看看结构性变换是不是会导致 dom 节点也重新生成了？？？必须一定保证复用 anchor 所在的 dom 节点才行。

所以结论？？？？
先搞定上面三个细节问题，不然后面的抽象都有问题。
不管是上面的哪种情况，更新的过程都可以总结成两步：`},
        ]
    }]
}

