import React from 'react';
import {fireEvent, render, RenderResult, waitFor} from '@testing-library/react';
import App from './App';
import * as WebSocket from 'ws'
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    CreateSessionEvent,
    JoinedSessionFailure,
    JoinedSessionSuccessfully,
    SendMessageEvent,
    ServerMessage
} from "./types/shared";
import {v4} from "uuid";
import flushPromises from "flush-promises/index";


describe('App', () => {
    const fakeBackendPort = 9999
    let server: WebSocket.Server

    const uuidRegex = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

    beforeEach(() => {
        process.env.REACT_APP_BACKEND_URL = `ws://localhost:${fakeBackendPort}`
    })

    afterEach(async () => {
        await new Promise((resolve, _) => {
            server.close(() => resolve())
        })

        await flushPromises()
    })

    function createServer() {
        server = new WebSocket.Server({port: fakeBackendPort})
    }

    function onServerMessage(block: (message: string) => void) {
        server.on("connection", (connection) => {
            connection.on("message", block)
        })
    }

    async function renderAndJoinSession(): Promise<RenderResult> {
        const renderResult = render(<App/>)

        await waitFor(() => {
            expect(renderResult.getByText('Connected to server!')).toBeInTheDocument()
        })

        expect(renderResult.getByText("Not connected to session...")).toBeInTheDocument()

        const sessionIdInput = renderResult.getByTestId("session-id")
        const joinSessionButton = renderResult.getByText('Join Session')

        fireEvent.change(sessionIdInput, {target: {value: v4()}})
        fireEvent.click(joinSessionButton)

        return renderResult
    }

    async function renderAndCreateSession(): Promise<RenderResult> {
        const renderResult = render(<App/>)

        await waitFor(() => {
            expect(renderResult.getByText('Connected to server!')).toBeInTheDocument()
        })

        expect(renderResult.getByText("Not connected to session...")).toBeInTheDocument()

        const createSessionButton = renderResult.getByText('Create Session')

        fireEvent.click(createSessionButton)

        return renderResult
    }

    async function spoofSuccessfulJoinSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new JoinedSessionSuccessfully())
                connection.send(joinedSuccessfully)
                await then(connection)
            })

        })
    }

    async function spoofFailureToJoinSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new JoinedSessionFailure())

                connection.send(joinedSuccessfully)

                await then(connection)
            })
        })
    }

    async function spoofSuccessfulCreateSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const createdSessionSuccessfully = JSON.stringify(new CreatedSessionSuccessfully())
                connection.send(createdSessionSuccessfully)

                await then(connection)
            })
        })
    }

    async function spoofFailureToCreateSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new CreatedSessionFailure())
                connection.send(joinedSuccessfully)

                await then(connection)
            })
        })
    }

    function assertItHidesTheSessionStuff(
        renderFunction: () => Promise<RenderResult>
    ) {
        it('hides the session stuff after connecting', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("session-container")).not.toBeInTheDocument()
                })
                done()
            })

            const renderResult = await renderFunction()
        })
    }

    function assertShowingMessageContainer(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('displays the message container after connecting to session', async (done) => {
            createServer();

            await spoofFunction(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                done()
            })

            const renderResult = await renderFunction()
            expect(renderResult.queryByTestId("message-container")).not.toBeInTheDocument()
        });
    }

    function assertSendingData(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('sends messages to the server with the right data', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("Sup bro!")

                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                const sendMessageBox = renderResult.getByTestId("send-message")
                const sendButton = renderResult.getByText("Send")

                fireEvent.change(sendMessageBox, {target: {value: "Sup bro!"}})
                fireEvent.click(sendButton)
            })

            const renderResult = await renderFunction()
        });
    }

    function assertDisplayingConnectedStatus(
        spoofFunction: (args: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('displays connected status when it works', async (done) => {
            createServer();

            await spoofFunction(async () => {
                await waitFor(() => {
                    const connectedMessageRegex = new RegExp(`Connected to session! ${uuidRegex}`)
                    expect(renderResult.getByTestId("session-status").textContent).toMatch(connectedMessageRegex)
                })

                done()
            })

            const renderResult = await renderFunction()
        })
    }

    function assertReceivingData(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('receives the data from the server', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                const serverMessage1 = JSON.stringify(new ServerMessage("Hello there!"))
                const serverMessage2 = JSON.stringify(new ServerMessage("Cool guy!!"))

                connection.send(serverMessage1)
                connection.send(serverMessage2)

                await waitFor(() => {
                    const text = renderResult.getByTestId("receive-message").getAttribute("value")
                    expect(text).toEqual("Hello there!<br/>Cool guy!!")
                })

                done()
            })

            const renderResult = await renderFunction()
        })
    }

    function assertShowingError(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>,
        join: boolean
    ) {
        it("displays an error when it fails", async (done) => {
            createServer();

            await spoofFunction(async () => {
                await waitFor(() => {
                    if (join) {
                        expect(renderResult.getByText("Failed to join session :(")).toBeInTheDocument()
                    } else {
                        expect(renderResult.getByText("Failed to create session :(")).toBeInTheDocument()
                    }
                })

                done()
            })

            const renderResult = await renderFunction()
            expect(renderResult.queryByText("Failed to join session :(")).not.toBeInTheDocument()
            expect(renderResult.queryByText("Failed to create session :(")).not.toBeInTheDocument()
        });
    }

    function assertOpeningSessionCorrectly(
        join: boolean,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('sends correct data to open a session', async (done) => {
            createServer();

            onServerMessage((message: string) => {
                const parsedEvent = JSON.parse(message) as CreateSessionEvent
                expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))

                if (join) {
                    expect(parsedEvent.type).toMatch("JOIN_SESSION")
                } else {
                    expect(parsedEvent.type).toMatch("CREATE_SESSION")
                }

                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))

                expect(parsedEvent.userId).not.toEqual(parsedEvent.sessionId)
                done()
            })

            await renderFunction()
        });
    }

    function assertSendingPlay(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('sends a PLAY message when the video is played', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("PLAY")

                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                const video = renderResult.getByTestId("video")
                fireEvent.play(video)
            })

            const renderResult = await renderFunction()
        });
    }

    function assertSendingPause(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('sends a PAUSE message when the video is paused', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("PAUSE")

                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                const video = renderResult.getByTestId("video")
                fireEvent.pause(video)
            })

            const renderResult = await renderFunction()
        });
    }

    describe("creating a session", () => {
        assertOpeningSessionCorrectly(false, renderAndCreateSession)

        assertShowingError(spoofFailureToCreateSession, renderAndCreateSession, false)

        assertShowingMessageContainer(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertDisplayingConnectedStatus(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertItHidesTheSessionStuff(renderAndCreateSession)

        assertSendingData(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertReceivingData(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertSendingPlay(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertSendingPause(spoofSuccessfulCreateSession, renderAndCreateSession)
    })

    describe("joining an existing session", () => {
        assertOpeningSessionCorrectly(true, renderAndJoinSession)

        assertShowingError(spoofFailureToJoinSession, renderAndJoinSession, true)

        assertShowingMessageContainer(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertDisplayingConnectedStatus(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertItHidesTheSessionStuff(renderAndJoinSession)

        assertSendingData(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertReceivingData(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertSendingPlay(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertSendingPause(spoofSuccessfulJoinSession, renderAndJoinSession)
    })

    it('says when its connected to the server', async () => {
        createServer();

        const {getByText} = render(<App/>)
        const status = getByText("Connecting to server...")
        expect(status).not.toBeEmpty()

        await waitFor(() => {
            expect(getByText('Connected to server!')).toBeInTheDocument()
        })
    });

    it('hides session stuff until it is connected to the server', async () => {
        createServer();

        const {getByText, queryByTestId} = render(<App/>)
        const status = getByText("Connecting to server...")
        expect(status).not.toBeEmpty()

        expect(queryByTestId("session-container")).not.toBeInTheDocument()

        await waitFor(() => {
            expect(getByText('Connected to server!')).toBeInTheDocument()
            expect(queryByTestId("session-container")).toBeInTheDocument()
        })
    });
})

