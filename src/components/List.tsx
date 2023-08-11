
//
// class List extends TextBlock{
//     static readonly hasContent = false
//     static setCursor(node: DocNode, offset: number) : [DocNode, number] | false {
//         return ListItem.setCursor(node.children!.head.next.node, offset)
//     }
//     static createDefaultChildren() : NodeData[] {
//         return [{ type: 'ListItem'}]
//     }
//     render({ children }:RenderProp) {
//         return (
//             <div data-type-list>
//                 {children}
//             </div>
//         )
//     }
// }
//
// class ListItem extends TextBlock{
//     static readonly createSiblingAsDefault = true
//     static setCursor(node: DocNode, offset: number) : [DocNode, number] | false {
//         return Para.setCursor(node.content!.head.next.node, offset)
//     }
//     static createDefaultContent() : NodeData[]{
//         return [{ type: 'Para', content: [{ type: 'Text', value: ''}]}]
//     }
//     static async unwrap(node: DocNode, createDefaultNode: (content?: LinkedList) => DocNode = node.root!.createDefaultNode.bind(node.root)) {
//         const parent = node.parent
//         if (parent.constructor === ListItem) {
//
//             // TODO 要不要 waitUpdate?
//             const { removed: removedSiblings } = parent.children!.removeBetween(node)
//             // 自己不是一级节点，往上提一级，接管父节点后面的兄弟节点。
//             node.remove()
//
//             // 接管了 父元素的所有兄弟节点。
//             // TODO 要不要 waitUpdate?
//             if (removedSiblings?.from) {
//                 node.children!.insertBefore(new LinkedListFragment(removedSiblings!))
//             }
//
//             // 提了一级上来
//             parent.parent.children.insertAfter(node, parent)
//
//         } else if (parent.constructor === List)  {
//             // 1. content 变 para。2. children 提上了，如果没有了，那么整个结构都不要了。 3. 如果自己不是第一个，还要和前面的 List 断开变成两个结构。
//             const previousSibling = node.previousSibling
//
//             if (previousSibling) {
//                 // 把前面的都移除，创建一个新的 list
//                 const {removed: removedSiblings} = parent.children!.removeBetween(undefined, previousSibling)
//                 const newList = new List({type: 'List'})
//                 newList.children!.insertBefore(new LinkedListFragment(removedSiblings!))
//                 parent.container!.insertBefore(newList, parent)
//             }
//
//
//             // 把自己移除，改成 Para
//             node.remove()
//             const newNode = createDefaultNode(node.content!.move())
//             // const newNode = buildModelFromData({ type: 'Para', content: node.toJSON().content })
//             //
//             // 把转化成了普通节点的新节点插入
//             // CAUTION TODO 到底为什么这里要 waitUpdate ???? 好像还是没有想清楚
//             // await waitUpdate()
//             parent.container!.insertBefore(newNode, parent)
//             //
//             // 把自己的 children 全部提升一级
//             if (node.children!.size()) {
//                 parent.children!.insertAfter(node.children!.move())
//             }
//
//             // 说明自己是唯一的一个节点，整个 List 都空了，结构也就不要了
//             if (!parent.children!.size()) {
//                 parent.remove()
//             }
//
//         } else {
//             throw new Error('invalid listItem, something wrong')
//         }
//     }
//     static wrap(node: DocNode) {
//         // TODO 自己降一级，其他不变
//     }
//
//     render({ children, content }:RenderProp) {
//         return (
//             <div data-type-listitem>
//                 <div data-type-listitem-content>{content}</div>
//                 <div data-type-listitem-children>{children}</div>
//             </div>
//         )
//     }
// }
//