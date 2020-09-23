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
import {CloseEvent} from "ws";

const port = parseInt(process.env.VCAP_APP_PORT || "9090");

export default class Server {
    private socketServer?: WebSocket.Server
    sessions: Map<string, Map<string, WebSocket>> = new Map()

    start() {
        this.socketServer = new WebSocket.Server({port})
        console.log(`Started server on ${port}`)

        this.socketServer.on("connection", (connection: WebSocket) => {
            connection.onmessage = (event: WebSocket.MessageEvent) => {
                this.triageMessage(event, connection)
            }

            connection.onclose = (event: WebSocket.CloseEvent) => {
                this.promptConnectionToCleanUp(event, connection)
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
                this.handleSendingMessage(receivedEvent)
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

        connection.addEventListener("clean-up", () => {
            this.cleanUpConnection(event.sessionId, event.userId)
        })

        const users = new Map<string, WebSocket>()
        users.set(event.userId, connection)
        this.sessions.set(event.sessionId, users)

        const connectionSuccessful = JSON.stringify(new CreatedSessionSuccessfully(event.sessionId))
        connection.send(connectionSuccessful)
    }

    handleJoiningSession(event: JoinSessionEvent, connection: WebSocket) {
        const session = this.sessions.get(event.sessionId)
        if (!session) {
            const joinFailed = JSON.stringify(new JoinedSessionFailure())
            connection.send(joinFailed)
            return
        }

        connection.addEventListener("clean-up", () => {
            this.cleanUpConnection(event.sessionId, event.userId)
        })

        session.set(event.userId, connection)

        const connectionSuccessful = JSON.stringify(new JoinedSessionSuccessfully(event.sessionId))
        connection.send(connectionSuccessful)
    }

    handleSendingMessage(event: ClientSocketEvent) {
        const clientMessage = event as SendMessageEvent
        const session = this.sessions.get(event.sessionId)
        if (!session) {
            throw new Error("please test me")
        }

        const sendMessage = JSON.stringify(new ServerMessage(clientMessage.message))
        console.log(sendMessage)
        session.forEach((savedConnection: WebSocket, userId: string) => {
            if (userId === event.userId) return
            savedConnection.send(sendMessage)
        })
    }

    promptConnectionToCleanUp(event: CloseEvent, connection: WebSocket) {
        connection.emit("clean-up")
    }

    cleanUpConnection(sessionId: string, userId: string) {
        const session = this.sessions.get(sessionId)

        if (session) {
            session.delete(userId)

            if (session.size === 0) {
                this.sessions.delete(sessionId)
            }
        }
    }

    close() {
       return new Promise((resolve) => {
            this?.socketServer?.close(() => resolve())
        })
    }
}


