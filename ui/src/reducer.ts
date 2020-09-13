import {MutableRefObject, useReducer} from "react";
import {
    AppState,
    CreatedSessionSuccessfully,
    JoinedSessionSuccessfully,
    ServerMessage,
    ServerSocketEvent
} from "./types/shared";
import {v4} from "uuid";

export const initialState: AppState = {
    connectedToServer: false,
    connectedToSession: false,
    joinSessionFailure: false,
    createSessionFailure: false,
    sessionId: '',
    userId: v4()
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

export default function useSocketReducer(videoRef: MutableRefObject<HTMLVideoElement | null>) {
    return useReducer(getReducer(videoRef), initialState);
}