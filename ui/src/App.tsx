import React, {useRef, useState} from 'react';
import VideoPlayer, {VideoPlayerProps} from "./VideoPlayer";
import useSocketReducer from "./reducer";
import useSubscriptionToWebSocket from "./hooks/useSubscriptionToWebSocket";
import styled from "styled-components";
import {useWebSocket} from "./hooks/useWebSocket";

function App() {
    const {connection, socketMessenger} = useWebSocket();

    const videoRef = useRef<HTMLVideoElement>(null)
    const [joinSessionIdInput, setJoinSessionIdInput] = useState('')

    const [{
        connectedToServer,
        connectedToSession,
        joinSessionFailure,
        createSessionFailure,
        sessionId,
        userCount,
        userId
    }, dispatch] = useSocketReducer(videoRef, socketMessenger)

    useSubscriptionToWebSocket(connection, dispatch)

    function createSession() {
        socketMessenger.current?.createSession(userId)
    }

    function joinSession() {
        socketMessenger.current?.joinSession(joinSessionIdInput, userId)
    }

    const videoPlayerProps: VideoPlayerProps = {userId, sessionId, socketMessenger, videoRef}

    return (
        <StyledApp>
            <div data-testid="status">
                {
                    connectedToServer ?
                        <div>Connected to server 🟢</div> :
                        <div>Unable to connect to server 🔴</div>
                }
            </div>

            <div data-testid="session-status">
                {connectedToSession && <SessionStatusContainer>
                    <div>Connected to session 🟢</div>
                    <br/>
                    <UsersDisplay>{"👨‍💻".repeat(userCount)}</UsersDisplay>
                    <br/>
                    <div data-testid="session-id">{sessionId}</div>
                </SessionStatusContainer>}
            </div>

            {joinSessionFailure && <div>Failed to join session :(</div>}
            {createSessionFailure && <div>Failed to create session :(</div>}

            <br/>
            {connectedToServer && !connectedToSession && <div data-testid="session-container">
                <SessionButton onClick={createSession}>Create Session</SessionButton>

                <JoinSessionContainer>
                    <SessionButton onClick={joinSession}>Join Session</SessionButton>
                    <input onChange={({target: {value}}) => setJoinSessionIdInput(value)} data-testid="session-id"/>
                </JoinSessionContainer>
            </div>}

            {connectedToSession && <VideoPlayer {...videoPlayerProps}/>}
        </StyledApp>
    );
}

const StyledApp = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
`

const SessionButton = styled.button`
    width: 15rem;
    height: 2rem;
    margin-bottom: 2px;
`

const SessionStatusContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`

const JoinSessionContainer = styled.div`
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
`

const UsersDisplay = styled.div`
    font-size: 2rem;
`

export default App;
