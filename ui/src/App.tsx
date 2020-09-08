import React, {useRef, useState} from 'react';
import {v4} from "uuid"
import {
    ClientSocketEvent,
    CreateSessionEvent,
    JoinSessionEvent,
    SendMessageEvent,
    ServerMessage,
    ServerSocketEvent
} from "./types/shared";
// @ts-ignore
import topgun from './topgun.mp4';

function App() {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL!

    const [connectedToServer, setConnectedToServer] = useState<boolean>(false)
    const [connectedToSession, setConnectedToSession] = useState<boolean>(false)
    const [messages, setMessages] = useState<Array<string>>([])
    const [sendMessageValue, setSendMessage] = useState("")
    const [joinSessionIdInput, setJoinSessionIdInput] = useState("")
    const [joinSessionFailure, setJoinSessionFailure] = useState(false)
    const [createSessionFailure, setCreateSessionFailure] = useState(false)
    const [sessionId, setSessionId] = useState("")

    const videoRef = useRef<HTMLVideoElement>(null)

    const userId = useRef(v4())
    const connection = useRef(new WebSocket(BACKEND_URL))

    connection.current.onopen = () => {
        setConnectedToServer(true)
    }

    connection.current.onmessage = (event: MessageEvent) => {
        try {
            const parsedEvent = JSON.parse(event.data) as ServerSocketEvent
            switch (parsedEvent.type) {
                case "JOINED_SESSION_SUCCESSFULLY": {
                    setConnectedToSession(true)
                    setSessionId(joinSessionIdInput)
                    break
                }
                case "CREATED_SESSION_SUCCESSFULLY": {
                    setConnectedToSession(true)
                    break
                }
                case "SERVER_MESSAGE": {
                    const serverMessage = parsedEvent as ServerMessage
                    handleReceivedMessage(serverMessage.message)
                    setMessages(messages.concat(serverMessage.message))
                    break
                }
                case "JOIN_SESSION_FAILURE": {
                    setJoinSessionFailure(true)
                    break
                }
                case "CREATE_SESSION_FAILURE": {
                    setCreateSessionFailure(true)
                    break
                }
            }
        } catch {
        }
    }

    function handleReceivedMessage(message: string) {
        switch (message) {
            case "PLAY": videoRef?.current?.play(); break
            case "PAUSE": videoRef?.current?.pause(); break
        }
    }

    function sendMessageToSocket(event: ClientSocketEvent) {
        const stringEvent = JSON.stringify(event)
        connection.current.send(stringEvent)
    }

    function createSession() {
        const newSessionId = v4()
        setSessionId(newSessionId)

        const createSessionEvent = new CreateSessionEvent(newSessionId, userId.current)
        sendMessageToSocket(createSessionEvent)
    }

    function joinSession(sessionId: string) {
        const joinSessionEvent = new JoinSessionEvent(sessionId, userId.current)
        sendMessageToSocket(joinSessionEvent)
    }

    function sendMessage(message: string) {
        const sendMessageEvent = new SendMessageEvent(message, sessionId, userId.current)
        sendMessageToSocket(sendMessageEvent)
    }

    const messageValues = messages.join("<br/>")

    function handlePlay() {
        sendMessage("PLAY")
    }

    function handlePause() {
        sendMessage("PAUSE")
    }

    return (
        <>
            <div data-testid="status">{connectedToServer ? "Connected to server!" : "Connecting to server..."}</div>
            <div data-testid="session-status">{connectedToSession ? `Connected to session! ${sessionId}` : "Not connected to session..."}</div>
            {joinSessionFailure && <div>Failed to join session :(</div>}
            {createSessionFailure && <div>Failed to create session :(</div>}

            {connectedToServer && !connectedToSession && <div data-testid="session-container">
                <button onClick={createSession}>Create Session</button>
                <div>
                    <button onClick={() => joinSession(joinSessionIdInput)}>Join Session</button>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </div>
            </div>}

            {connectedToSession && <div data-testid="message-container">
                <video
                    id="video"
                    data-testid="video"
                    ref={videoRef}
                    src={topgun}
                    controls
                    onPlay={handlePlay}
                    onPause={handlePause}
                />
            </div>}
        </>
    );
}

export default App;
