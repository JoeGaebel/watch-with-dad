import React, {useRef, useState} from 'react';
import VideoPlayer, {VideoPlayerProps} from "./VideoPlayer";
import useSocketReducer from "./reducer";
import useWebSocket from "./hooks/useWebSocket";
import SocketMessenger from "./SocketMessenger";
import {getWebSocketURL} from "./util";

function App() {
    const connection = useRef(new WebSocket(getWebSocketURL()))
    const videoRef = useRef<HTMLVideoElement>(null)
    const socketMessenger = useRef(new SocketMessenger(connection))
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

    const videoPlayerProps: VideoPlayerProps = {userId, sessionId, socketMessager: socketMessenger, videoRef}

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
                <button onClick={() => socketMessenger.current.createSession(userId)}>Create Session</button>

                <div>
                    <button onClick={() => socketMessenger.current.joinSession(joinSessionIdInput, userId)}>Join Session</button>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </div>
            </div>}

            {connectedToSession && <VideoPlayer {...videoPlayerProps}/>}
        </>
    );
}

export default App;
