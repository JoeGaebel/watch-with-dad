import React from 'react';
import {fireEvent, render, RenderResult, waitFor} from '@testing-library/react';
import App from './App';
import * as WebSocket from 'ws'
import {act} from "react-dom/test-utils";
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully, CreateSessionEvent,
    JoinedSessionFailure,
    JoinedSessionSuccessfully, JoinSessionEvent, SendMessageEvent, ServerMessage
} from "./types/shared";


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

        fireEvent.change(sessionIdInput, {target: {value: "some-session-id"}})
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
                act(() => {
                    connection.send(joinedSuccessfully)
                })
                await then(connection)
            })

        })
    }

    async function spoofFailureToJoinSession(then: (connection: WebSocket) => Promise<void>) {
        act(() => {
            server.on("connection", (connection: WebSocket) => {
                connection.on("message", async () => {
                    const joinedSuccessfully = JSON.stringify(new JoinedSessionFailure())

                    connection.send(joinedSuccessfully)

                    await then(connection)
                })
            })
        })
    }

    async function spoofSuccessfulCreateSession(then: (connection: WebSocket) => Promise<void>) {
        act(() => {
            server.on("connection", (connection: WebSocket) => {
                connection.on("message", async () => {
                    const createdSessionSuccessfully = JSON.stringify(new CreatedSessionSuccessfully())

                    connection.send(createdSessionSuccessfully)

                    await then(connection)
                })
            })
        })
    }

    async function spoofFailureToCreateSession(then: (connection: WebSocket) => Promise<void>) {
        act(() => {
            server.on("connection", (connection: WebSocket) => {
                connection.on("message", async () => {
                    const joinedSuccessfully = JSON.stringify(new CreatedSessionFailure())

                    connection.send(joinedSuccessfully)

                    await then(connection)
                })
            })
        })
    }

    describe("creating a session", () => {
        it('sends correct data', async (done) => {
            createServer();

            onServerMessage((message: string) => {
                const parsedEvent = JSON.parse(message) as CreateSessionEvent
                expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.type).toMatch("CREATE_SESSION")
                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))

                expect(parsedEvent.userId).not.toEqual(parsedEvent.sessionId)
                server.close()
                done()
            })

            await renderAndCreateSession()
        });

        it('displays connected status when it works', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async () => {
                await waitFor(() => {
                    const connectedMessageRegex = new RegExp(`Connected to session! ${uuidRegex}`)
                    expect(renderResult.getByTestId("session-status").textContent).toMatch(connectedMessageRegex)
                })

                server.close()
                done()
            })

            const renderResult = await renderAndCreateSession()
        })

        it('displays the message container after creating the session', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                server.close()
                done()
            })

            const renderResult = await renderAndCreateSession()
            expect(renderResult.queryByTestId("message-container")).not.toBeInTheDocument()
        })

        it('hides the session stuff after connecting', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("session-container")).not.toBeInTheDocument()
                })
                server.close()
                done()
            })

            const renderResult = await renderAndCreateSession()
        })

        it('displays an error when it fails', async (done) => {
            createServer();

            await spoofFailureToCreateSession(async () => {
                await waitFor(() => {
                    expect(renderResult.getByText("Failed to create session :(")).toBeInTheDocument()
                })

                done()
            })

            const renderResult = await renderAndJoinSession()
            expect(renderResult.queryByText("Failed to create session :(")).not.toBeInTheDocument()
        })

        it('receives the data from the server', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async (connection) => {
                const serverMessage1 = JSON.stringify(new ServerMessage("Hello there!"))
                const serverMessage2 = JSON.stringify(new ServerMessage("Cool guy!!"))

                connection.send(serverMessage1)
                connection.send(serverMessage2)

                await waitFor(() => {
                    const text = renderResult.getByTestId("receive-message").getAttribute("value")
                    expect(text).toEqual("Hello there!<br/>Cool guy!!")
                })

                server.close()
                done()
            })

            const renderResult = await renderAndCreateSession()
        })

        it('sends messages to the server with the right data', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("Sup bro!")

                    server.close()
                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                // I'm sorry Joe :(
                try {
                    const sendMessageBox = renderResult.getByTestId("send-message")
                    const sendButton = renderResult.getByText("Send")

                    fireEvent.change(sendMessageBox, {target: {value: "Sup bro!"}})
                    fireEvent.click(sendButton)
                } catch {
                }
            })

            const renderResult = await renderAndCreateSession()
        });
    })

    describe("joining an existing session", () => {
        it('sends the correct data to join a session', async (done) => {
            createServer();

            onServerMessage((message: string) => {
                const parsedEvent = JSON.parse(message) as JoinSessionEvent
                expect(parsedEvent.sessionId).toMatch("some-session-id")
                expect(parsedEvent.type).toMatch("JOIN_SESSION")
                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))

                expect(parsedEvent.userId).not.toEqual(parsedEvent.sessionId)
                server.close()
                done()
            })

            await renderAndJoinSession()
        });

        it('displays connected status when it works', async (done) => {
            createServer();

            await spoofSuccessfulJoinSession(async () => {
                await waitFor(() => {
                    const connectedMessageRegex = `Connected to session! some-session-id`
                    expect(renderResult.getByText(new RegExp(connectedMessageRegex))).toBeInTheDocument()
                })

                server.close()
                done()
            })

            const renderResult = await renderAndJoinSession()
        });

        it('displays the message container after connecting to session', async (done) => {
            createServer();

            await spoofSuccessfulJoinSession(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                server.close()
                done()
            })

            const renderResult = await renderAndJoinSession()
            expect(renderResult.queryByTestId("message-container")).not.toBeInTheDocument()
        });

        it("displays an error when it fails", async (done) => {
            createServer();

            await spoofFailureToJoinSession(async () => {
                await waitFor(() => {
                    expect(renderResult.getByText("Failed to join session :(")).toBeInTheDocument()
                })

                done()
            })

            const renderResult = await renderAndJoinSession()
            expect(renderResult.queryByText("Failed to join session :(")).not.toBeInTheDocument()
        });

        it('receives the data from the server', async (done) => {
            createServer();

            await spoofSuccessfulJoinSession(async (connection) => {
                const serverMessage1 = JSON.stringify(new ServerMessage("Hello there!"))
                const serverMessage2 = JSON.stringify(new ServerMessage("Cool guy!!"))

                connection.send(serverMessage1)
                connection.send(serverMessage2)

                await waitFor(() => {
                    const text = renderResult.getByTestId("receive-message").getAttribute("value")
                    expect(text).toEqual("Hello there!<br/>Cool guy!!")
                })

                server.close()
                done()
            })

            const renderResult = await renderAndJoinSession()
        });

        it('sends messages to the server with the right data', async (done) => {
            createServer();

            await spoofSuccessfulJoinSession(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch("some-session-id")
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("Sup bro!")

                    server.close()
                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                // I'm sorry Joe :(
                try {
                    const sendMessageBox = renderResult.getByTestId("send-message")
                    const sendButton = renderResult.getByText("Send")

                    fireEvent.change(sendMessageBox, {target: {value: "Sup bro!"}})
                    fireEvent.click(sendButton)
                } catch {
                }
            })

            const renderResult = await renderAndJoinSession()
        });

        it('hides the session stuff after connecting', async (done) => {
            createServer();

            await spoofSuccessfulCreateSession(async () => {
                await waitFor(() => {
                    expect(renderResult.queryByTestId("session-container")).not.toBeInTheDocument()
                })
                server.close()
                done()
            })

            const renderResult = await renderAndJoinSession()
        })
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

