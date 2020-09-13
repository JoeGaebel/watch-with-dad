import React, {ChangeEvent, MutableRefObject} from "react";
import {ClientSocketEvent, SendMessageEvent} from "./types/shared";

export interface VideoPlayerProps {
    sendMessageToSocket: (event: ClientSocketEvent) => void,
    videoRef:  MutableRefObject<HTMLVideoElement | null>
    sessionId: string,
    userId: MutableRefObject<string>
}

export function VideoPlayer(props: VideoPlayerProps): JSX.Element {
    const {videoRef, sessionId, userId, sendMessageToSocket} = props

    function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file && videoRef.current) {
            videoRef.current.src = URL.createObjectURL(file)
        }
    }

    function handlePlay() {
        sendMessage("PLAY")
    }

    function handlePause() {
        sendMessage("PAUSE")
    }

    function sendMessage(message: string) {
        const sendMessageEvent = new SendMessageEvent(message, sessionId, userId.current)
        sendMessageToSocket(sendMessageEvent)
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
            style={{
                userSelect: "none",
                border: 0,
                outline: 0,
            }}
            id="video"
            data-testid="video"
            ref={videoRef}
            controls
            width={400}
            height={200}
            onPlay={handlePlay}
            onPause={handlePause}
        />
    </div>
}