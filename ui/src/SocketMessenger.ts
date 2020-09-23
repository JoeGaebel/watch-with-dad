import {ClientSocketEvent, CreateSessionEvent, JoinSessionEvent, SendMessageEvent} from "./types/shared";
import uuid from "short-uuid";
import {MutableRefObject} from "react";

export default class SocketMessenger {
    socketRef: MutableRefObject<WebSocket | null>
    private justReceivedMessage: boolean = false

    constructor(socketRef: MutableRefObject<WebSocket | null>) {
        this.socketRef = socketRef
    }

    private sendMessageToSocket(event: ClientSocketEvent) {
        const stringEvent = JSON.stringify(event)
        this.socketRef.current?.send(stringEvent)
    }

    setJustReceivedMessage() {
        this.justReceivedMessage = true
    }

    sendPlay(sessionId: string, userId: string) {
        this.sendMessage("PLAY", sessionId, userId)
    }

    sendPause(sessionId: string, userId: string) {
        this.sendMessage("PAUSE", sessionId, userId)
    }

    sendSeek(sessionId: string, userId: string, seekedTime: number) {
        this.sendMessage(`SEEK ${seekedTime}`, sessionId, userId)
    }

    sendMessage(message: string, sessionId: string, userId: string) {
        if (this.justReceivedMessage) {
            this.justReceivedMessage = false
            return
        }

        const sendMessageEvent = new SendMessageEvent(message, sessionId, userId)
        this.sendMessageToSocket(sendMessageEvent)
    }

    createSession(userId: string) {
        const newSessionId = uuid.generate()
        const createSessionEvent = new CreateSessionEvent(newSessionId, userId)
        this.sendMessageToSocket(createSessionEvent)
    }

    joinSession(sessionId: string, userId: string) {
        const joinSessionEvent = new JoinSessionEvent(sessionId, userId)
        this.sendMessageToSocket(joinSessionEvent)
    }
}

