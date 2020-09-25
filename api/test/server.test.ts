import Server from "../src/server";
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    CreateSessionEvent,
    JoinedSessionFailure,
    JoinedSessionSuccessfully,
    JoinSessionEvent,
    SendMessageEvent,
    ServerMessage,
    UserCount
} from "../../ui/src/types/shared";
import uuid from "short-uuid"
import buildSocketExpectation from "./SocketExpectation";
import {waitForTruth} from "./util";

const WebSocket = require("ws");

describe('Server', () => {
    let server: Server

    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation()
    })

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

    it('responds successfully creating a session', async () => {
        createServer();

        const createSession = new CreateSessionEvent(uuid.generate(), uuid.generate())
        const sender = new WebSocket("ws://localhost:9090")

        const expectedEvent = new CreatedSessionSuccessfully(createSession.sessionId)
        const socketExpectation = buildSocketExpectation().add(sender, expectedEvent)

        sender.onopen = () => {
            sender.send(JSON.stringify(createSession))
        }

        await socketExpectation.toComplete()
    });

    it('does not allow two sessions with the same id', async () => {
        createServer();

        const sameUUID = uuid.generate()

        const createSession = new CreateSessionEvent(sameUUID, uuid.generate())

        const sender = new WebSocket("ws://localhost:9090")

        const expectedSuccess = new CreatedSessionSuccessfully(sameUUID)
        const expectedFailure = new CreatedSessionFailure()

        const expectation = buildSocketExpectation()
            .add(sender, expectedSuccess)
            .add(sender, expectedFailure)

        sender.onopen = () => {
            sender.send(JSON.stringify(createSession))
            sender.send(JSON.stringify(createSession))
        }

        await expectation.toComplete()
    });

    it('allows joining a session', async () => {
        createServer();

        const sessionId = uuid.generate()

        const createSession = new CreateSessionEvent(sessionId, uuid.generate())
        const joinSession = new JoinSessionEvent(sessionId, uuid.generate())

        const user1 = new WebSocket("ws://localhost:9090")
        const user2 = new WebSocket("ws://localhost:9090")

        const expectedCreateMessage = new CreatedSessionSuccessfully(sessionId);
        const expectedJoinMessage = new JoinedSessionSuccessfully(sessionId);

        const expectation = buildSocketExpectation()
            .add(user1, expectedCreateMessage, () => user2.send(JSON.stringify(joinSession)))
            .add(user2, expectedJoinMessage)

        user1.onopen = () => user1.send(JSON.stringify(createSession))

        await expectation.toComplete()
    });

    it('returns an error if there is no session to join', async () => {
        createServer();

        const joinSession = new JoinSessionEvent(uuid.generate(), uuid.generate())

        const user = new WebSocket("ws://localhost:9090")

        const expectation = buildSocketExpectation()
            .add(user, new JoinedSessionFailure())

        user.onopen = () => {
            user.send(JSON.stringify(joinSession))
        }

        await expectation.toComplete()
    });

    it('forwards a message from one client to the other', async () => {
        createServer();

        const sessionId = uuid.generate()
        const user1Id = uuid.generate();
        const user2Id = uuid.generate();

        const createSession = new CreateSessionEvent(sessionId, user1Id)
        const joinSession = new JoinSessionEvent(sessionId, user2Id)

        const user1 = new WebSocket("ws://localhost:9090")
        const user2 = new WebSocket("ws://localhost:9090")

        const expectation = buildSocketExpectation()
            .add(user1, new CreatedSessionSuccessfully(sessionId), () => user2.send(JSON.stringify(joinSession)))
            .add(user1, new ServerMessage("G'Day m8!"))
            .add(user2, new JoinedSessionSuccessfully(sessionId), () => {
                const message = JSON.stringify(new SendMessageEvent("G'Day m8!", sessionId, user2Id))
                user2.send(message)
            })

        user1.onopen = () => {
            user1.send(JSON.stringify(createSession))
        }

        await expectation.toComplete()
    })

    it('keeps users updated on the user count', async () => {
        createServer();

        const sessionId = uuid.generate()
        const user1Id = uuid.generate();
        const user2Id = uuid.generate();

        const createSession = new CreateSessionEvent(sessionId, user1Id)
        const joinSession = new JoinSessionEvent(sessionId, user2Id)

        const creatorUser = new WebSocket("ws://localhost:9090")
        const joinerUser = new WebSocket("ws://localhost:9090")

        const expectation = buildSocketExpectation()
            .add(creatorUser, new CreatedSessionSuccessfully(sessionId))
            .add(creatorUser, new UserCount(1), () => joinerUser.send(JSON.stringify(joinSession)))
            .add(creatorUser, new UserCount(2))
            .add(creatorUser, new UserCount(1))
            .add(joinerUser, new JoinedSessionSuccessfully(sessionId))
            .add(joinerUser, new UserCount(2), () => joinerUser.close())

        creatorUser.onopen = () => {
            creatorUser.send(JSON.stringify(createSession))
        }

        await expectation.toComplete()
    })

    describe("session management", () => {
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

        it('cleans up users and sessions', async (done) => {
            createServer();

            const sessionId = uuid.generate()
            const createSession = new CreateSessionEvent(sessionId, uuid.generate())
            const joinSession = new JoinSessionEvent(sessionId, uuid.generate())

            const user1 = new WebSocket("ws://localhost:9090")
            const user2 = new WebSocket("ws://localhost:9090")

            const expectation = buildSocketExpectation()
                .add(user1, new CreatedSessionSuccessfully(sessionId), () => user2.send(JSON.stringify(joinSession)))
                .add(user2, new JoinedSessionSuccessfully(sessionId), () => checkClosingBehavior(sessionId, done, user1, user2))

            user1.onopen = () => {
                user1.send(JSON.stringify(createSession))
            }

            await expectation.toComplete()
        });
    });
})
