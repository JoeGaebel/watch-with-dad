import Server from "../src/server";
const WebSocket = require("ws");

describe('Server', () => {
    let server: Server

    afterEach(async () => {
        await server.close()
    })

    function createServer() {
        server = new Server()
        server.start()
    }

    it('open a websocket server', (done) => {
        createServer();

        const connection = new WebSocket("ws://localhost:9090")
        connection.onopen = () => done() && connection.close()
    });

    it('forwards a message from one client to the other', (done) => {
        createServer();

        const receiver = new WebSocket("ws://localhost:9090")
        const sender = new WebSocket("ws://localhost:9090")

        const sentData = "G'day mate!"

        receiver.onmessage = (event: MessageEvent) => {
            expect(event.data).toEqual(sentData)
            done()
        }

        sender.onopen = () => sender.send(sentData)
    });
})
