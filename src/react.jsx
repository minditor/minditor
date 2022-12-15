/**@jsx createElement*/
import { createElement, useState, useEffect, StrictMode} from "react";
import ReactDOM from 'react-dom/client'

function Table({ value }) {

    // let [innerText, setText] = useState('')


    // useEffect(() => {
    //     // return autorun(() => {
    //     //     setText(value.value)
    //     // })
    // })


    return (
        <table border={1}>
            <thead>
            <tr>
                <th>head</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td>
                    {value}
                </td>
            </tr>
            </tbody>
        </table>
    )
}


const root = document.getElementById('app')
ReactDOM.createRoot(root).render(
    <StrictMode>
        <Table value={1111}/>
    </StrictMode>
)
