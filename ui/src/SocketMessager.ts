import {ClientSocketEvent, CreateSessionEvent, JoinSessionEvent, SendMessageEvent} from "./types/shared";
import {v4} from "uuid";
import {MutableRefObject} from "react";

export default class SocketMessager {
    socketRef: MutableRefObject<WebSocket>

    constructor(socketRef: MutableRefObject<WebSocket>) {
        this.socketRef = socketRef
    }

    private sendMessageToSocket(event: ClientSocketEvent) {
        const stringEvent = JSON.stringify(event)
        this.socketRef.current.send(stringEvent)
    }

    sendPlay(sessionId: string, userId: string) {
        this.sendMessage("PLAY", sessionId, userId)
    }

    sendPause(sessionId: string, userId: string) {
        this.sendMessage("PAUSE", sessionId, userId)
    }

    sendMessage(message: string, sessionId: string, userId: string) {
        const sendMessageEvent = new SendMessageEvent(message, sessionId, userId)
        this.sendMessageToSocket(sendMessageEvent)
    }

    createSession(userId: string) {
        const newSessionId = v4()
        const createSessionEvent = new CreateSessionEvent(newSessionId, userId)
        this.sendMessageToSocket(createSessionEvent)
    }

    joinSession(sessionId: string, userId: string) {
        const joinSessionEvent = new JoinSessionEvent(sessionId, userId)
        this.sendMessageToSocket(joinSessionEvent)
    }
}
