import * as WebSocket from "ws";

export default class Server {
    private socketServer?: WebSocket.Server
    private users: Array<WebSocket> = []

    private port = 9090

    start() {
        this.socketServer = new WebSocket.Server({port: this.port})
        console.log(`Started server on ${this.port}`)

        this.socketServer.on("connection", (connection: WebSocket) => {
            this.users.push(connection)
            connection.on("message", this.handleMessage.bind(this))
        })
    }

    handleMessage(data: WebSocket.Data) {
        this.users.forEach((connection: WebSocket) => connection.send(data))
    }

    close() {
       return new Promise((resolve) => {
            this?.socketServer?.close(() => resolve())
        })
    }
}


