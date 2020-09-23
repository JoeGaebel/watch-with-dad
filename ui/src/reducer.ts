import {MutableRefObject, useReducer} from "react";
import {
    AppState,
    CreatedSessionSuccessfully,
    JoinedSessionSuccessfully,
    ServerMessage,
    ServerSocketEvent
} from "./types/shared";
import uuid from "short-uuid"
import SocketMessenger from "./SocketMessenger";

export const initialState: AppState = {
    connectedToServer: false,
    connectedToSession: false,
    joinSessionFailure: false,
    createSessionFailure: false,
    sessionId: '',
    userId: uuid.generate()
}

const seekRegex = /^SEEK (\d*\.?\d*$)/

export function getReducer(
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    socketMessenger: MutableRefObject<SocketMessenger | null>
): (state: AppState, event: ServerSocketEvent) => AppState {
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
                handleReceivedMessage(serverMessage.message, videoRef, socketMessenger)
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

function handleReceivedMessage(
    message: string,
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    socketMessenger: MutableRefObject<SocketMessenger | null>
) {
    switch (true) {
        case /PLAY/.test(message):
            socketMessenger.current?.setJustReceivedMessage()
            videoRef?.current?.play().catch(() => {});
            break
        case /PAUSE/.test(message):
            socketMessenger.current?.setJustReceivedMessage()
            videoRef?.current?.pause();
            break
        case /SEEK/.test(message):
            const timestamp = message.match(seekRegex)?.[1]

            if (videoRef.current && socketMessenger.current && timestamp) {
                socketMessenger.current.setJustReceivedMessage()
                videoRef.current.currentTime = parseFloat(timestamp);
            }

            break
    }
}

export default function useSocketReducer(
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    socketMessenger: MutableRefObject<SocketMessenger | null>
) {
    return useReducer(getReducer(videoRef, socketMessenger), initialState);
}
