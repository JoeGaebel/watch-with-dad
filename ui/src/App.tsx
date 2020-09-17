import React, {useRef, useState} from 'react';
import VideoPlayer, {VideoPlayerProps} from "./VideoPlayer";
import useSocketReducer from "./reducer";
import useWebSocket from "./hooks/useWebSocket";
import SocketMessager from "./SocketMessager";
import {getWebSocketURL} from "./util";

function App() {
    const connection = useRef(new WebSocket(getWebSocketURL()))
    const videoRef = useRef<HTMLVideoElement>(null)
    const socketMessager = useRef(new SocketMessager(connection))
    const [joinSessionIdInput, setJoinSessionIdInput] = useState('')

    const [{
        connectedToServer,
        connectedToSession,
        joinSessionFailure,
        createSessionFailure,
        sessionId,
        userId
    }, dispatch] = useSocketReducer(videoRef)

    useWebSocket(connection, dispatch)

    const videoPlayerProps: VideoPlayerProps = {userId, sessionId, socketMessager, videoRef}

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
                <button onClick={() => socketMessager.current.createSession(userId)}>Create Session</button>

                <div>
                    <button onClick={() => socketMessager.current.joinSession(joinSessionIdInput, userId)}>Join Session</button>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </div>
            </div>}

            {connectedToSession && <VideoPlayer {...videoPlayerProps}/>}
        </>
    );
}

export default App;
