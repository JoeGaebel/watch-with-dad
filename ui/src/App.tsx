import React, {MutableRefObject, useEffect, useRef, useState} from 'react';
import VideoPlayer, {VideoPlayerProps} from "./VideoPlayer";
import useSocketReducer from "./reducer";
import useWebSocket from "./hooks/useWebSocket";
import SocketMessenger from "./SocketMessenger";
import {getWebSocketURL} from "./util";

function App() {
    const connection: MutableRefObject<WebSocket | null> = useRef(null)
    const socketMessenger: MutableRefObject<SocketMessenger | null> = useRef(null)

    useEffect(() => {
        connection.current = new WebSocket(getWebSocketURL())
        socketMessenger.current = new SocketMessenger(connection)
    }, [])

    const videoRef = useRef<HTMLVideoElement>(null)
    const [joinSessionIdInput, setJoinSessionIdInput] = useState('')

    const [{
        connectedToServer,
        connectedToSession,
        joinSessionFailure,
        createSessionFailure,
        sessionId,
        userId
    }, dispatch] = useSocketReducer(videoRef, socketMessenger)

    useWebSocket(connection, dispatch)

    function createSession() {
        socketMessenger.current?.createSession(userId)
    }

    function joinSession() {
        socketMessenger.current?.joinSession(joinSessionIdInput, userId)
    }

    const videoPlayerProps: VideoPlayerProps = {userId, sessionId, socketMessenger, videoRef}

    return (
        <>
            <div data-testid="status">
                {connectedToServer ? "Connected to server!" : "Connecting to server..."}
            </div>
            <div data-testid="session-status">
                {connectedToSession ? `Connected to session! ${sessionId}` : "Not connected to session..."}
            </div>

            {joinSessionFailure && <div>Failed to join session :(</div>}
            {createSessionFailure && <div>Failed to create session :(</div>}

            {connectedToServer && !connectedToSession && <div data-testid="session-container">
                <button onClick={createSession}>Create Session</button>

                <div>
                    <button onClick={joinSession}>Join Session</button>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </div>
            </div>}

            {connectedToSession && <VideoPlayer {...videoPlayerProps}/>}
        </>
    );
}

export default App;
