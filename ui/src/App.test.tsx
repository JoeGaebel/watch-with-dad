import React from 'react';
import {act, cleanup, fireEvent, render, RenderResult, waitFor} from '@testing-library/react';
import App from './App';
import * as WebSocket from 'ws'
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    CreateSessionEvent,
    JoinedSessionFailure,
    JoinedSessionSuccessfully,
    SendMessageEvent,
    ServerMessage,
    UserCount
} from "./types/shared";
import flushPromises from "flush-promises";
import uuid from "short-uuid"
import * as Util from './util'
// @ts-ignore
import topgun from '../../topgun.mp4'

describe('App', () => {
    let server: WebSocket.Server
    let playSpy: jest.SpyInstance
    let pauseSpy: jest.SpyInstance
    let createObjectURLSpy: jest.SpyInstance
    let renderResult: RenderResult | null

    const uuidRegex = ".{22}$"

    enum TriggerEvent {
        PLAY,
        PAUSE,
        SEEK
    }

    interface TestCaseParams {
        type: TestCategory,
        renderFunction: () => Promise<RenderResult>,
        successMockFunction: (arg: (connection: WebSocket) => Promise<void>) => Promise<void>,
        failureMockFunction: (arg: (connection: WebSocket) => Promise<void>) => Promise<void>
    }

    enum TestCategory {
        CREATING_A_SESSION,
        JOINING_A_SESSION
    }

    function triggerEvent(eventName: TriggerEvent) {
        const video = renderResult!.getByTestId("video")
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

    beforeEach(async () => {
        renderResult = null

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

        renderResult?.unmount()
        cleanup()
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
            expect(renderResult!.getByText('Connected to server 🟢')).toBeInTheDocument()
        })

        const sessionIdInput = renderResult.getByTestId("session-id")
        const joinSessionButton = renderResult.getByText('Join Session')

        fireEvent.change(sessionIdInput, {target: {value: uuid.generate()}})
        fireEvent.click(joinSessionButton)

        return renderResult
    }

    async function renderAndCreateSession(): Promise<RenderResult> {
        renderResult = render(<App/>)

        await waitFor(() => {
            expect(renderResult!.getByText('Connected to server 🟢')).toBeInTheDocument()
        })

        const createSessionButton = renderResult.getByText('Create Session')

        fireEvent.click(createSessionButton)

        return renderResult
    }

    async function mockSuccessfulJoinSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new JoinedSessionSuccessfully(uuid.generate()))
                connection.send(joinedSuccessfully)
                await then(connection)
            })
        })
    }

    async function mockFailureToJoinSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new JoinedSessionFailure())

                connection.send(joinedSuccessfully)

                await then(connection)
            })
        })
    }

    async function mockSuccessfulCreateSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const createdSessionSuccessfully = JSON.stringify(new CreatedSessionSuccessfully(uuid.generate()))
                connection.send(createdSessionSuccessfully)

                await then(connection)
            })
        })
    }

    async function mockFailureToCreateSession(then: (connection: WebSocket) => Promise<void>) {
        server.on("connection", (connection: WebSocket) => {
            connection.on("message", async () => {
                const joinedSuccessfully = JSON.stringify(new CreatedSessionFailure())
                connection.send(joinedSuccessfully)

                await then(connection)
            })
        })
    }

    async function assertItHidesTheSessionStuff(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async () => {
            await waitFor(() => {
                expect(renderResult!.queryByTestId("session-container")).not.toBeInTheDocument()
            })
            done()
        })

        await renderFunction()
    }

    async function assertShowingMessageContainer(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async () => {
            await waitFor(() => {
                expect(renderResult!.queryByTestId("video-container")).toBeInTheDocument()
            })

            done()
        })

        await renderFunction()
        expect(renderResult!.queryByTestId("video-container")).not.toBeInTheDocument()
    }

    async function assertDisplayingConnectedStatus(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async () => {
            await waitFor(() => {
                const connectedMessageRegex = new RegExp(`Connected to session 🟢.*`)
                expect(renderResult!.getByTestId("session-status").textContent).toMatch(connectedMessageRegex)
            })

            done()
        })

        await renderFunction()
    }

    async function assertShowingError(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {
            type,
            renderFunction,
            failureMockFunction
        } = testParams

        createServer();

        await failureMockFunction(async () => {
            await waitFor(() => {
                if (type === TestCategory.JOINING_A_SESSION) {
                    expect(renderResult!.getByText("Failed to join session :(")).toBeInTheDocument()
                } else {
                    expect(renderResult!.getByText("Failed to create session :(")).toBeInTheDocument()
                }
            })

            done()
        })

        await renderFunction()
        expect(renderResult!.queryByText("Failed to join session :(")).not.toBeInTheDocument()
        expect(renderResult!.queryByText("Failed to create session :(")).not.toBeInTheDocument()
    }

    async function assertOpeningSessionCorrectly(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {
            type,
            renderFunction,
        } = testParams

        createServer();

        onServerMessage((message: string) => {
            const parsedEvent = JSON.parse(message) as CreateSessionEvent
            expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))

            if (type === TestCategory.JOINING_A_SESSION) {
                expect(parsedEvent.type).toMatch("JOIN_SESSION")
            } else {
                expect(parsedEvent.type).toMatch("CREATE_SESSION")
            }

            expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))

            expect(parsedEvent.userId).not.toEqual(parsedEvent.sessionId)
            done()
        })

        await renderFunction()
    }

    async function assertSendingPlay(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            connection.on("message", (message: string) => {
                const parsedEvent = JSON.parse(message) as SendMessageEvent
                expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.message).toEqual("PLAY")

                done()
            })

            await waitFor(() => {
                expect(renderResult!.queryByTestId("video-container")).toBeInTheDocument()
            })

            const video = renderResult!.getByTestId("video")
            fireEvent.play(video)
        })

        await renderFunction()
    }

    async function assertSendingPause(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            connection.on("message", (message: string) => {
                const parsedEvent = JSON.parse(message) as SendMessageEvent
                expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.message).toEqual("PAUSE")

                done()
            })

            await waitFor(() => {
                expect(renderResult!.queryByTestId("video-container")).toBeInTheDocument()
            })

            const video = renderResult!.getByTestId("video")
            fireEvent.pause(video)
        })

        await renderFunction()
    }

    async function assertReceivingPlay(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            let video: HTMLVideoElement | null = null;

            connection.on("message", () => {
                fail("It sent a message :(")
            })

            await waitFor(() => {
                video = renderResult!.queryByTestId("video") as HTMLVideoElement | null
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
    }

    async function assertReceivingPause(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            let video: HTMLVideoElement | null = null;

            connection.on("message", () => {
                fail("It sent a message :(")
            })

            await waitFor(() => {
                video = renderResult!.queryByTestId("video") as HTMLVideoElement | null
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
    }

    async function assertRenderingLocalVideo(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async () => {
            let video: HTMLVideoElement

            await waitFor(() => {
                video = renderResult!.getByTestId("video") as HTMLVideoElement
                expect(video).toBeInTheDocument()
            })

            expect(video!.src).toEqual("")

            const fileInput = renderResult!.getByTestId("file-input")

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
    }

    async function assertSendingSeek(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            connection.on("message", (message: string) => {
                const parsedEvent = JSON.parse(message) as SendMessageEvent
                expect(parsedEvent.sessionId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.type).toMatch("SEND_MESSAGE")
                expect(parsedEvent.userId).toMatch(new RegExp(uuidRegex))
                expect(parsedEvent.message).toEqual("SEEK 666.001")

                done()
            })

            await waitFor(() => {
                expect(renderResult!.queryByTestId("video-container")).toBeInTheDocument()
            })

            const video = renderResult!.getByTestId("video") as HTMLVideoElement
            fireEvent.seeking(video)
            video.currentTime = 666.001
            fireEvent.seeked(video)
        })

        await renderFunction()
    }

    async function assertReceivingSeek(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            let video: HTMLVideoElement | null = null;

            connection.on("message", () => {
                fail("It sent a message :(")
            })

            await waitFor(() => {
                video = renderResult!.queryByTestId("video") as HTMLVideoElement | null
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
    }

    async function assertReceivingUserCount(
        testParams: TestCaseParams,
        done: jest.DoneCallback
    ) {
        const {renderFunction, successMockFunction} = testParams

        createServer();

        await successMockFunction(async (connection: WebSocket) => {
            expect(renderResult!.queryByText("👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻")).toEqual(null)

            const serverMessage = JSON.stringify(new UserCount(5))
            connection.send(serverMessage)

            await waitFor(() => {
                expect(renderResult!.queryByText("👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻")).toBeInTheDocument()
            })

            done()
        })

        await renderFunction()
    }

    describe.each<TestCaseParams>([
        {
            type: TestCategory.CREATING_A_SESSION,
            renderFunction: renderAndCreateSession,
            successMockFunction: mockSuccessfulCreateSession,
            failureMockFunction: mockFailureToCreateSession
        },
        {
            type: TestCategory.JOINING_A_SESSION,
            renderFunction: renderAndJoinSession,
            successMockFunction: mockSuccessfulJoinSession,
            failureMockFunction: mockFailureToJoinSession
        }
    ])('common behavior', (testCaseParams) => {
        it('hides the session stuff after connecting', async (done) => {
            await assertOpeningSessionCorrectly(testCaseParams, done)
        })

        it('displays the message container after connecting to session', async (done) => {
            await assertShowingError(testCaseParams, done)
        })

        it('displays connected status when it works', async (done) => {
            await assertShowingMessageContainer(testCaseParams, done)
        })

        it("displays an error when it fails", async (done) => {
            await assertDisplayingConnectedStatus(testCaseParams, done)
        })

        it('sends correct data to open a session', async (done) => {
            await assertItHidesTheSessionStuff(testCaseParams, done)
        })

        it('sends a PLAY message when the video is played', async (done) => {
            await assertSendingPlay(testCaseParams, done)
        })

        it('sends a PAUSE message when the video is paused', async (done) => {
            await assertSendingPause(testCaseParams, done)
        })

        it('plays the video and does not repeat a play message', async (done) => {
            await assertReceivingPlay(testCaseParams, done)
        })

        it('pauses the video and does not repeat a pause message', async (done) => {
            await assertReceivingPause(testCaseParams, done)
        })

        it('renders the video the user selects', async (done) => {
            await assertRenderingLocalVideo(testCaseParams, done)
        })

        it('sends a SEEK message when the video is seeked', async (done) => {
            await assertSendingSeek(testCaseParams, done)
        })

        it('seeks the video to the received spot and does not repeat the message', async (done) => {
            await assertReceivingSeek(testCaseParams, done)
        })

        it('displays the count of the users', async (done) => {
            await assertReceivingUserCount(testCaseParams, done)
        })
    })

    it('says when its connected to the server', async () => {
        createServer();

        const {getByText} = render(<App/>)
        const status = getByText("Unable to connect to server 🔴")
        expect(status).not.toBeEmpty()

        await waitFor(() => {
            expect(getByText('Connected to server 🟢')).toBeInTheDocument()
        })
    });

    it('hides session stuff until it is connected to the server', async () => {
        createServer();

        const {getByText, queryByTestId} = render(<App/>)
        const status = getByText("Unable to connect to server 🔴")
        expect(status).not.toBeEmpty()

        expect(queryByTestId("session-container")).not.toBeInTheDocument()

        await waitFor(() => {
            expect(getByText('Connected to server 🟢')).toBeInTheDocument()
            expect(queryByTestId("session-container")).toBeInTheDocument()
        })
    });
})

