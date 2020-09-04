import React, {useRef, useState} from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL!

function App() {
    const [connected, setConnected] = useState<boolean>(false)
    const [messages, setMessages] = useState<Array<string>>([])
    const [sendMessageValue, setSendMessage] = useState("")

    const connection = useRef(new WebSocket(BACKEND_URL))

    connection.current.onopen = () => {
        setConnected(true)
    }

    connection.current.onmessage = (event: MessageEvent) => {
        setMessages(messages.concat(event.data))
    }

    function sendMessage(text: string) {
        connection.current.send(text)
    }

    const messageValues = messages.join("<br/>")

    return (
        <>
            <div data-testid="status">{connected ? "Connected!" : "Connecting..."}</div>
            <input
                data-testid="send-message"
                id="send-message"
                value={sendMessageValue}
                onChange={({target: {value}}) => setSendMessage(value)}
            />
            <br/>
            <button data-testid="button" onClick={() => sendMessage(sendMessageValue)}>Send</button>
            <br/>
            <input readOnly data-testid="receive-message" id="receive-message" value={messageValues}/>
        </>
    );
}

export default App;
