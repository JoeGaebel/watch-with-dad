import React from 'react';
import {act, fireEvent, render, RenderResult, waitFor} from '@testing-library/react';
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
import flushPromises from "flush-promises";
// @ts-ignore
import topgun from '../../topgun.mp4'
import * as Util from './util'

describe('App', () => {
    let server: WebSocket.Server
    let playSpy: jest.SpyInstance
    let pauseSpy: jest.SpyInstance
    let createObjectURLSpy: jest.SpyInstance
    let renderResult: RenderResult

    const uuidRegex = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

    enum TriggerEvent {
        PLAY,
        PAUSE,
        SEEK
    }

    function triggerEvent(eventName: TriggerEvent) {
        const video = renderResult.getByTestId("video")
        switch (eventName) {
            case TriggerEvent.PLAY:
                fireEvent.play(video)
                break
            case TriggerEvent.PAUSE:
                fireEvent.pause(video)
                break
            case TriggerEvent.SEEK:
                fireEvent.seeked(video)
                break
        }
        return Promise.resolve()
    }

    beforeEach(() => {
        jest.resetAllMocks()

        playSpy = jest
            .spyOn(window.HTMLMediaElement.prototype, 'play')
            .mockImplementation(() => triggerEvent(TriggerEvent.PLAY))

        pauseSpy = jest
            .spyOn(window.HTMLMediaElement.prototype, 'pause')
            .mockImplementation(() => triggerEvent(TriggerEvent.PAUSE))

        createObjectURLSpy = jest
            .fn()
            .mockImplementation(() => "hey-look-its-a-fake-url")

        // @ts-ignore
        window.URL = {createObjectURL: createObjectURLSpy}

        jest.spyOn(Util, 'getWebSocketURL').mockReturnValue("ws://localhost:9999")
    })

    afterEach(async () => {
        await new Promise((resolve, _) => {
            server.close(() => resolve())
        })

        await flushPromises()
    })

    function createServer() {
        server = new WebSocket.Server({port: 9999})
    }

    function onServerMessage(block: (message: string) => void) {
        server.on("connection", (connection) => {
            connection.on("message", block)
        })
    }

    async function renderAndJoinSession(): Promise<RenderResult> {
        renderResult = render(<App/>)

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
        renderResult = render(<App/>)

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
                const joinedSuccessfully = JSON.stringify(new JoinedSessionSuccessfully(v4()))
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
                const createdSessionSuccessfully = JSON.stringify(new CreatedSessionSuccessfully(v4()))
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

            await renderFunction()
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

            await renderFunction()
            expect(renderResult.queryByTestId("message-container")).not.toBeInTheDocument()
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

            await renderFunction()
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

            await renderFunction()
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

            await renderFunction()
        });
    }

    function assertSendingPause(
        spoofFunction: (arg: (connection: WebSocket) => Promise<void>) => Promise<void>,
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

            await renderFunction()
        });
    }

    function assertReceivingPlay(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('plays the video and does not repeat a play message', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                let video: HTMLVideoElement | null = null;

                connection.on("message", () => {
                    fail("It sent a message :(")
                })

                await waitFor(() => {
                    video = renderResult.queryByTestId("video") as HTMLVideoElement | null
                    expect(video).toBeInTheDocument()
                })

                expect(playSpy).not.toHaveBeenCalled()
                expect(pauseSpy).not.toHaveBeenCalled()

                const serverMessage = JSON.stringify(new ServerMessage("PLAY"))
                connection.send(serverMessage)

                await waitFor(() => {
                    expect(playSpy).toHaveBeenCalledTimes(1)
                    expect(pauseSpy).not.toHaveBeenCalled()
                })

                done()
            })

            await renderFunction()
        })
    }

    function assertReceivingPause(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('pauses the video and does not repeat a pause message', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                let video: HTMLVideoElement | null = null;

                connection.on("message", () => {
                    fail("It sent a message :(")
                })

                await waitFor(() => {
                    video = renderResult.queryByTestId("video") as HTMLVideoElement | null
                    expect(video).toBeInTheDocument()
                })

                expect(playSpy).not.toHaveBeenCalled()
                expect(pauseSpy).not.toHaveBeenCalled()

                const serverMessage = JSON.stringify(new ServerMessage("PAUSE"))
                connection.send(serverMessage)

                await waitFor(() => {
                    expect(playSpy).not.toHaveBeenCalled()
                    expect(pauseSpy).toHaveBeenCalledTimes(1)
                })

                done()
            })

            await renderFunction()
        })
    }

    function assertRenderingLocalVideo(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('renders the video the user selects', async (done) => {
            createServer();

            await spoofFunction(async () => {
                let video: HTMLVideoElement

                await waitFor(() => {
                    video = renderResult.getByTestId("video") as HTMLVideoElement
                    expect(video).toBeInTheDocument()
                })

                expect(video!.src).toEqual("")

                const fileInput = renderResult.getByTestId("file-input")

                act(() => {
                    fireEvent.change(fileInput, {
                        target: {
                            files: [topgun]
                        }
                    })
                })

                expect(video!.src).toEqual("http://localhost/hey-look-its-a-fake-url")

                done()
            })

            await renderFunction()
        })
    }

    function assertSendingSeek(
        spoofFunction: (arg: (connection: WebSocket) => Promise<void>) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('sends a SEEK message when the video is seeked', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                connection.on("message", (message: string) => {
                    const parsedEvent = JSON.parse(message) as SendMessageEvent
                    expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                    expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                    expect(parsedEvent.message).toEqual("SEEK 666.001")

                    done()
                })

                await waitFor(() => {
                    expect(renderResult.queryByTestId("message-container")).toBeInTheDocument()
                })

                const video = renderResult.getByTestId("video") as HTMLVideoElement
                fireEvent.seeking(video)
                video.currentTime = 666.001
                fireEvent.seeked(video)
            })

            await renderFunction()
        });
    }

    function assertReceivingSeek(
        spoofFunction: (arg: any) => Promise<void>,
        renderFunction: () => Promise<RenderResult>
    ) {
        it('seeks the video to the received spot and does not repeat the message', async (done) => {
            createServer();

            await spoofFunction(async (connection: WebSocket) => {
                let video: HTMLVideoElement | null = null;

                connection.on("message", () => {
                    fail("It sent a message :(")
                })

                await waitFor(() => {
                    video = renderResult.queryByTestId("video") as HTMLVideoElement | null
                    expect(video).toBeInTheDocument()
                })

                const serverMessage = JSON.stringify(new ServerMessage("SEEK 666.001"))
                connection.send(serverMessage)

                await waitFor(() => {
                    expect(video?.currentTime).toEqual(666.001)
                })

                await triggerEvent(TriggerEvent.SEEK)

                await new Promise((r) => setTimeout(r, 1));

                done()
            })

            await renderFunction()
        })
    }

    describe("creating a session", () => {
        assertOpeningSessionCorrectly(false, renderAndCreateSession)

        assertShowingError(spoofFailureToCreateSession, renderAndCreateSession, false)

        assertShowingMessageContainer(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertDisplayingConnectedStatus(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertItHidesTheSessionStuff(renderAndCreateSession)

        assertSendingPlay(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertSendingPause(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertReceivingPlay(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertReceivingPause(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertRenderingLocalVideo(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertSendingSeek(spoofSuccessfulCreateSession, renderAndCreateSession)

        assertReceivingSeek(spoofSuccessfulCreateSession, renderAndCreateSession)
    })

    describe("joining an existing session", () => {
        assertOpeningSessionCorrectly(true, renderAndJoinSession)

        assertShowingError(spoofFailureToJoinSession, renderAndJoinSession, true)

        assertShowingMessageContainer(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertDisplayingConnectedStatus(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertItHidesTheSessionStuff(renderAndJoinSession)

        assertSendingPlay(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertSendingPause(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertReceivingPlay(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertReceivingPause(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertRenderingLocalVideo(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertSendingSeek(spoofSuccessfulJoinSession, renderAndJoinSession)

        assertReceivingSeek(spoofSuccessfulJoinSession, renderAndJoinSession)
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

