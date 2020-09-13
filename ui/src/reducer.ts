import {MutableRefObject} from "react";
import {CreatedSessionSuccessfully, JoinedSessionSuccessfully, ServerMessage, ServerSocketEvent} from "./types/shared";
import {AppState} from "./App";

export function getReducer(videoRef: MutableRefObject<HTMLVideoElement | null>):
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