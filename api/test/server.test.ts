import Server from "../src/server";
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    CreateSessionEvent, JoinedSessionFailure,
    JoinedSessionSuccessfully,
    JoinSessionEvent, SendMessageEvent, ServerMessage
} from "../../ui/src/types/shared";
import {v4} from "uuid";

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

    it('responds successfully creating a session', (done) => {
        createServer();

        const createSession = new CreateSessionEvent(v4(), v4())
        const sender = new WebSocket("ws://localhost:9090")

        sender.onmessage = (event: MessageEvent) => {
            const response = JSON.parse(event.data) as CreatedSessionSuccessfully
            expect(response.type).toEqual("CREATED_SESSION_SUCCESSFULLY")
            done()
        }

        sender.onopen = () => {
            sender.send(JSON.stringify(createSession))
        }
    });

    it('does not allow two sessions with the same id', (done) => {
        createServer();

        const sameUUID = v4()

        const createSession = new CreateSessionEvent(sameUUID, v4())

        const sender = new WebSocket("ws://localhost:9090")

        let count = 0
        sender.onmessage = (event: MessageEvent) => {
            if (count == 0) {
                const response = JSON.parse(event.data) as CreatedSessionSuccessfully
                expect(response.type).toEqual("CREATED_SESSION_SUCCESSFULLY")
                count++
            } else {
                const response = JSON.parse(event.data) as CreatedSessionFailure
                expect(response.type).toEqual("CREATE_SESSION_FAILURE")
                done()
            }
        }

        sender.onopen = () => {
            sender.send(JSON.stringify(createSession))
            sender.send(JSON.stringify(createSession))
        }
    });

    it('allows joining a session', (done) => {
        createServer();

        const sessionId = v4()

        const createSession = new CreateSessionEvent(sessionId, v4())
        const joinSession = new JoinSessionEvent(sessionId, v4())

        const user1 = new WebSocket("ws://localhost:9090")
        const user2 = new WebSocket("ws://localhost:9090")

        user1.onmessage = (event: MessageEvent) => {
            const response = JSON.parse(event.data) as CreatedSessionSuccessfully
            expect(response.type).toEqual("CREATED_SESSION_SUCCESSFULLY")

            user2.send(JSON.stringify(joinSession))
        }

        user2.onmessage = (event: MessageEvent) => {
            const response = JSON.parse(event.data) as JoinedSessionSuccessfully
            expect(response.type).toEqual("JOINED_SESSION_SUCCESSFULLY")
            done()
        }

        user1.onopen = () => {
            user1.send(JSON.stringify(createSession))
        }
    });

    it('returns an error if there is no session to join', (done) => {
        createServer();

        const joinSession = new JoinSessionEvent(v4(), v4())

        const user = new WebSocket("ws://localhost:9090")

        user.onmessage = (event: MessageEvent) => {
            const response = JSON.parse(event.data) as JoinedSessionFailure
            expect(response.type).toEqual("JOIN_SESSION_FAILURE")
            done()
        }

        user.onopen = () => {
            user.send(JSON.stringify(joinSession))
        }
    });

    it('forwards a message from one client to the other', (done) => {
        createServer();

        const sessionId = v4()
        const user1Id = v4();
        const user2Id = v4();

        const createSession = new CreateSessionEvent(sessionId, user1Id)
        const joinSession = new JoinSessionEvent(sessionId, user2Id)

        const user1 = new WebSocket("ws://localhost:9090")
        const user2 = new WebSocket("ws://localhost:9090")

        let user1MessageCount = 0
        user1.onmessage = (event: MessageEvent) => {
            if (user1MessageCount == 0) {
                const response = JSON.parse(event.data) as CreatedSessionSuccessfully
                expect(response.type).toEqual("CREATED_SESSION_SUCCESSFULLY")

                user2.send(JSON.stringify(joinSession))
                user1MessageCount++
            } else {
                const response = JSON.parse(event.data) as ServerMessage
                expect(response.type).toEqual("SERVER_MESSAGE")
                expect(response.message).toEqual("G'Day m8!")

                done()
            }
        }

        user2.onmessage = (event: MessageEvent) => {
            const response = JSON.parse(event.data) as JoinedSessionSuccessfully
            expect(response.type).toEqual("JOINED_SESSION_SUCCESSFULLY")
            const message = JSON.stringify(new SendMessageEvent("G'Day m8!", sessionId, user2Id))

            user2.send(message)
        }

        user1.onopen = () => {
            user1.send(JSON.stringify(createSession))
        }
    })

    describe("session management", () => {
        function sleep(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function waitForTruth(test: () => boolean, attempts: number): Promise<void> {
            return new Promise<void>(async (resolve, reject) => {
                let i = 0;
                while (i < attempts) {
                    if (test()) {
                        return resolve()
                    }

                    await sleep(1000)
                    i++
                }
                fail()
                reject()
            })
        }

        async function checkClosingBehavior(
            sessionId: string,
            done: jest.DoneCallback,
            user1: WebSocket,
            user2: WebSocket
        ) {
            const sessions = server.sessions
            expect(sessions.size).toEqual(1)

            const session = sessions.get(sessionId)
            expect(session!!.size).toEqual(2)

            user1.close()
            await waitForTruth(() => session!!.size === 1, 3)

            user2.close()
            await waitForTruth(() => session!!.size === 0, 3)

            expect(sessions.size).toEqual(0)
            done()
        }

        it('cleans up users and sessions', (done) => {
            createServer();

            const sessionId = v4()
            const createSession = new CreateSessionEvent(sessionId, v4())
            const joinSession = new JoinSessionEvent(sessionId, v4())

            const user1 = new WebSocket("ws://localhost:9090")
            const user2 = new WebSocket("ws://localhost:9090")

            user1.onmessage = (event: MessageEvent) => {
                const response = JSON.parse(event.data) as CreatedSessionSuccessfully
                expect(response.type).toEqual("CREATED_SESSION_SUCCESSFULLY")

                user2.send(JSON.stringify(joinSession))
            }

            user2.onmessage = (event: MessageEvent) => {
                const response = JSON.parse(event.data) as JoinedSessionSuccessfully
                expect(response.type).toEqual("JOINED_SESSION_SUCCESSFULLY")

                checkClosingBehavior(sessionId, done, user1, user2)
            }

            user1.onopen = () => {
                user1.send(JSON.stringify(createSession))
            }
        });
    });
})
