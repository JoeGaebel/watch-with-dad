import React, {MutableRefObject, useReducer, useRef, useState} from 'react';
import {v4} from "uuid"
import {
    ClientSocketEvent, ConnectedToServerSuccessfully, CreatedSessionSuccessfully,
    CreateSessionEvent, JoinedSessionSuccessfully,
    JoinSessionEvent,
    ServerMessage,
    ServerSocketEvent
} from "./types/shared";
import {VideoPlayer} from "./VideoPlayer";

interface AppState {
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

function handleReceivedMessage(message: string, videoRef: MutableRefObject<HTMLVideoElement | null>) {
    switch (message) {
        case "PLAY":
            videoRef?.current?.play();
            break
        case "PAUSE":
            videoRef?.current?.pause();
            break
    }
}

function getReducer(videoRef: MutableRefObject<HTMLVideoElement | null>):
    (state: AppState, event: ServerSocketEvent) => AppState {
    return (state: AppState, action: ServerSocketEvent): AppState => {
        switch (action.type) {
            case "CONNECTED_TO_SERVER_SUCCESSFULLY": {
                return {...state, connectedToServer: true}
            }
            case "JOINED_SESSION_SUCCESSFULLY": {
                const joinedSessionEvent = action as JoinedSessionSuccessfully
                return {...state, connectedToSession: true, sessionId: joinedSessionEvent.sessionId}
            }
            case "CREATED_SESSION_SUCCESSFULLY": {
                const createdSessionEvent = action as CreatedSessionSuccessfully
                return {...state, connectedToSession: true, sessionId: createdSessionEvent.sessionId}
            }
            case "SERVER_MESSAGE": {
                const serverMessage = action as ServerMessage
                handleReceivedMessage(serverMessage.message, videoRef)
                return state
            }
            case "JOIN_SESSION_FAILURE": {
                return {...state, joinSessionFailure: true}
            }
            case "CREATE_SESSION_FAILURE": {
                return {...state, createSessionFailure: true}
            }
        }

        return state;
    }
}

function App() {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL!
    const connection = useRef(new WebSocket(BACKEND_URL))
    const videoRef = useRef<HTMLVideoElement>(null)
    const [joinSessionIdInput, setJoinSessionIdInput] = useState('')
    const reducer = getReducer(videoRef)

    const [{
        connectedToServer,
        connectedToSession,
        joinSessionFailure,
        createSessionFailure,
        sessionId,
        userId
    }, dispatch] = useReducer(reducer, initialState);

    connection.current.onopen = () => {
        const event = new ConnectedToServerSuccessfully()
        dispatch(event)
    }

    connection.current.onmessage = (event: MessageEvent) => {
        try {
            const parsedEvent = JSON.parse(event.data) as ServerSocketEvent
            dispatch(parsedEvent)
        } catch (error) {
        }
    }

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

    const videoPlayerProps = {userId, sessionId, sendMessageToSocket, videoRef}

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
