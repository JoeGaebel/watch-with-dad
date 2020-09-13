import React, {useReducer, useRef, useState} from 'react';
import {v4} from "uuid"
import {ClientSocketEvent, CreateSessionEvent, JoinSessionEvent} from "./types/shared";
import VideoPlayer, {VideoPlayerProps} from "./VideoPlayer";
import {getReducer} from "./reducer";
import useWebSocket from "./hooks/useWebSocket";

export interface AppState {
    connectedToServer: boolean,
    connectedToSession: boolean,
    joinSessionFailure: boolean,
    createSessionFailure: boolean,
    sessionId: string,
    userId: string
}

const initialState: AppState = {
    connectedToServer: false,
    connectedToSession: false,
    joinSessionFailure: false,
    createSessionFailure: false,
    sessionId: '',
    userId: v4()
}

function App() {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL!

    const connection = useRef(new WebSocket(BACKEND_URL))
    const videoRef = useRef<HTMLVideoElement>(null)
    const reducer = getReducer(videoRef)

    const [joinSessionIdInput, setJoinSessionIdInput] = useState('')

    const [{
        connectedToServer,
        connectedToSession,
        joinSessionFailure,
        createSessionFailure,
        sessionId,
        userId
    }, dispatch] = useReducer(reducer, initialState);

    useWebSocket(connection, dispatch)

    function sendMessageToSocket(event: ClientSocketEvent) {
        const stringEvent = JSON.stringify(event)
        connection.current.send(stringEvent)
    }

    function createSession() {
        const newSessionId = v4()
        const createSessionEvent = new CreateSessionEvent(newSessionId, userId)
        sendMessageToSocket(createSessionEvent)
    }

    function joinSession(sessionId: string) {
        const joinSessionEvent = new JoinSessionEvent(sessionId, userId)
        sendMessageToSocket(joinSessionEvent)
    }

    const videoPlayerProps: VideoPlayerProps = {userId, sessionId, sendMessageToSocket, videoRef}

    return (
        <>
            <div data-testid="status">{connectedToServer ? "Connected to server!" : "Connecting to server..."}</div>
            <div
                data-testid="session-status">{connectedToSession ? `Connected to session! ${sessionId}` : "Not connected to session..."}</div>
            {joinSessionFailure && <div>Failed to join session :(</div>}
            {createSessionFailure && <div>Failed to create session :(</div>}

            {connectedToServer && !connectedToSession && <div data-testid="session-container">
                <button onClick={createSession}>Create Session</button>
                <div>
                    <button onClick={() => joinSession(joinSessionIdInput)}>Join Session</button>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </div>
            </div>}

            {connectedToSession && <VideoPlayer {...videoPlayerProps}/>}
        </>
    );
}

export default App;
