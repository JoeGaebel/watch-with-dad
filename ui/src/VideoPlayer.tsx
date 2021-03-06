import React, {ChangeEvent, MutableRefObject, SyntheticEvent} from "react";
import SocketMessenger from "./SocketMessenger";
import styled from "styled-components";

export interface VideoPlayerProps {
    socketMessenger: MutableRefObject<SocketMessenger | null>,
    videoRef: MutableRefObject<HTMLVideoElement | null>
    sessionId: string,
    userId: string
}

export default function VideoPlayer(props: VideoPlayerProps): JSX.Element {
    const {videoRef, sessionId, userId, socketMessenger} = props

    function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file && videoRef.current) {
            videoRef.current.src = URL.createObjectURL(file)
            videoRef.current.style.display = "initial"
        }
    }

    function handleSeek(event: SyntheticEvent<HTMLVideoElement, Event>) {
        const seekedTime = (event.target as HTMLVideoElement).currentTime
        socketMessenger.current?.sendSeek(sessionId, userId, seekedTime)
    }

    function handlePlay(_: SyntheticEvent<HTMLVideoElement, Event>) {
        socketMessenger.current?.sendPlay(sessionId, userId);
    }

    function handlePause(_: SyntheticEvent<HTMLVideoElement, Event>) {
        socketMessenger.current?.sendPause(sessionId, userId);
    }

    const videoStyle = {
        userSelect: "none",
        border: 0,
        outline: 0,
        display: "none"
    }

    return <VideoContainer data-testid="video-container">
        <input
            type="file"
            data-testid="file-input"
            onChange={handleFile}
            accept="video/mp4,video/x-m4v,video/*"
        />
        <br/>
        <Video
            // @ts-ignore
            style={videoStyle}
            id="video"
            data-testid="video"
            ref={videoRef}
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeek}
        />
    </VideoContainer>
}

const VideoContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`

const Video = styled.video`
    width: 100%
`
