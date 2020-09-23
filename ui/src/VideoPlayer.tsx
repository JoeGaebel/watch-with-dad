import React, {ChangeEvent, MutableRefObject, SyntheticEvent} from "react";
import SocketMessenger from "./SocketMessenger";

export interface VideoPlayerProps {
    socketMessager: MutableRefObject<SocketMessenger>,
    videoRef: MutableRefObject<HTMLVideoElement | null>
    sessionId: string,
    userId: string
}

export default function VideoPlayer(props: VideoPlayerProps): JSX.Element {
    const {videoRef, sessionId, userId, socketMessager} = props

    function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file && videoRef.current) {
            videoRef.current.src = URL.createObjectURL(file)
            videoRef.current.style.display = "initial"
        }
    }

    function handleSeek(event: SyntheticEvent<HTMLVideoElement, Event>) {
        const seekedTime = (event.target as HTMLVideoElement).currentTime
        socketMessager.current.sendSeek(sessionId, userId, seekedTime)
    }

    function handlePlay(event: SyntheticEvent<HTMLVideoElement, Event>) {
        socketMessager.current.sendPlay(sessionId, userId);
    }

    function handlePause(event: SyntheticEvent<HTMLVideoElement, Event>) {
        socketMessager.current.sendPause(sessionId, userId);
    }

    const videoStyle = {
        userSelect: "none",
        border: 0,
        outline: 0,
        display: "none"
    }

    return <div data-testid="message-container">
        <input
            type="file"
            data-testid="file-input"
            onChange={handleFile}
            accept="video/mp4,video/x-m4v,video/*"
        />
        <br/>
        <video
            // @ts-ignore
            style={videoStyle}
            id="video"
            data-testid="video"
            ref={videoRef}
            controls
            width={400}
            height={200}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeek}
        />
    </div>
}
