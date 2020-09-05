import * as WebSocket from "ws";
import {
    ClientSocketEvent,
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    CreateSessionEvent,
    JoinedSessionFailure,
    JoinedSessionSuccessfully,
    JoinSessionEvent,
    SendMessageEvent,
    ServerMessage
} from "../../ui/src/types/shared";


export default class Server {
    private socketServer?: WebSocket.Server
    private sessions: Map<string, Map<string, WebSocket>> = new Map()

    private port = 9090

    start() {
        this.socketServer = new WebSocket.Server({port: this.port})
        console.log(`Started server on ${this.port}`)

        this.socketServer.on("connection", (connection: WebSocket) => {
            connection.onmessage = (event: WebSocket.MessageEvent) => {
                this.triageMessage(event, connection)
            }
        })
    }

    triageMessage(event: WebSocket.MessageEvent, connection: WebSocket) {
        const receivedEvent = JSON.parse(event.data as string) as ClientSocketEvent
        switch (receivedEvent.type) {
            case "CREATE_SESSION": {
                this.handleNewSession(receivedEvent, connection)
                break
            }
            case "JOIN_SESSION": {
                this.handleJoiningSession(receivedEvent, connection)
                break
            }
            case "SEND_MESSAGE": {
                this.handleSendingMessage(receivedEvent, connection)
                break
            }
        }
    }

    handleNewSession(event: CreateSessionEvent, connection: WebSocket) {
        const session = this.sessions.get(event.sessionId)

        if (session) {
            const connectionFailed = JSON.stringify(new CreatedSessionFailure())
            connection.send(connectionFailed)
            return
        }

        const users = new Map<string, WebSocket>()
        users.set(event.userId, connection)
        this.sessions.set(event.sessionId, users)

        const connectionSuccessful = JSON.stringify(new CreatedSessionSuccessfully())
        connection.send(connectionSuccessful)
    }

    handleJoiningSession(event: JoinSessionEvent, connection: WebSocket) {
        const session = this.sessions.get(event.sessionId)
        if (!session) {
            const joinFailed = JSON.stringify(new JoinedSessionFailure())
            connection.send(joinFailed)
            return
        }

        session.set(event.userId, connection)

        const connectionSuccessful = JSON.stringify(new JoinedSessionSuccessfully())
        connection.send(connectionSuccessful)
    }

    handleSendingMessage(event: ClientSocketEvent, connection: WebSocket) {
        const clientMessage = event as SendMessageEvent
        const session = this.sessions.get(event.sessionId)
        if (!session) {
            throw new Error("please test me")
        }

        const sendMessage = JSON.stringify(new ServerMessage(clientMessage.message))

        session.forEach((savedConnection: WebSocket, userId: string) => {
            if (userId === event.userId) return
            savedConnection.send(sendMessage)
        })
    }

    close() {
       return new Promise((resolve) => {
            this?.socketServer?.close(() => resolve())
        })
    }
}


