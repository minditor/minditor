/**@jsx createElement*/
// @ts-ignore
import {createElement} from "../src/DOM.js";
import {LinkedList} from "../src/linkedList";
import {buildReactiveLinkedList, waitUpdate} from "../src/buildReactiveView";


const container = document.createElement('div')
document.body.appendChild(container)

class Node {
    constructor(id) {
        this.id = id
    }
    render() {
        return <span>{this.id.toString()}</span>
    }
}

const list = new LinkedList(null)

const node1 = new Node(1)
const node2 = new Node(2)
const node3 = new Node(3)

list.insertBefore(node1)
list.insertBefore(node2)
list.insertBefore(node3)

const attach = buildReactiveLinkedList(list)
attach(container);

// 正常
// (async () => {
//     list.insertBefore(new Node(4), node2)
//     // await waitUpdate()
//     list.removeBetween(undefined, node2)
// })()

// 报错
(async () => {
    // 读了 node2.next 和 newNode.next
    list.insertAfter(new Node(4), node2)
    // await waitUpdate()
    // 要该 node2.next = null
    list.removeBetween(undefined, node2)
})()





