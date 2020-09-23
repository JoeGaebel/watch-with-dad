import {getReducer, initialState} from "./reducer";
import {MutableRefObject, useRef} from "react";
import SocketMessenger from "./SocketMessenger";
import {
    CreatedSessionFailure,
    CreatedSessionSuccessfully,
    JoinedSessionFailure,
    JoinedSessionSuccessfully,
    ServerMessage
} from "./types/shared";
import { renderHook } from '@testing-library/react-hooks'

describe("reducer", () => {
    let fakeVideo: HTMLVideoElement | null
    let fakeSocketMessenger: SocketMessenger | null
    let videoRef: MutableRefObject<HTMLVideoElement | null>
    let socketMessenger: MutableRefObject<SocketMessenger>

    beforeEach(() => {
        fakeVideo = {
            play: jest.fn(),
            pause: jest.fn()
        } as unknown as HTMLVideoElement

        fakeSocketMessenger = {setJustReceivedMessage: jest.fn()} as unknown as SocketMessenger

        videoRef = renderHook(() => useRef(fakeVideo)).result.current as unknown as MutableRefObject<HTMLVideoElement | null>
        socketMessenger = renderHook(() => useRef(fakeSocketMessenger)).result.current as unknown as MutableRefObject<SocketMessenger>
    })

    it('gracefully handles safari`s play shenanigans', () => {
        (fakeVideo!.play as unknown as jest.SpyInstance).mockRejectedValue(null)

        const reducer = getReducer(videoRef, socketMessenger)
        const event = new ServerMessage("PLAY")

        expect(() => reducer(initialState, event)).not.toThrow()
    });

    it('resets the error states when creating session worked', () => {
        const reducer = getReducer(videoRef, socketMessenger)
        const joinSessionFailure = new JoinedSessionFailure()
        const createSessionFailure = new CreatedSessionFailure()

        const stateWithError1 = reducer(initialState, joinSessionFailure)
        const stateWithError2 = reducer(stateWithError1, createSessionFailure)
        expect(stateWithError2.createSessionFailure).toEqual(true)
        expect(stateWithError2.joinSessionFailure).toEqual(true)

        const joinSessionSuccess = new JoinedSessionSuccessfully("asd")
        const stateWithErrorClearedFromJoinSuccess = reducer(stateWithError2, joinSessionSuccess)
        expect(stateWithErrorClearedFromJoinSuccess.createSessionFailure).toEqual(false)
        expect(stateWithErrorClearedFromJoinSuccess.joinSessionFailure).toEqual(false)

        const createSessionSuccess = new CreatedSessionSuccessfully("asd")
        const stateWithErrorClearedFromCreateSuccess = reducer(stateWithError2, createSessionSuccess)
        expect(stateWithErrorClearedFromCreateSuccess.createSessionFailure).toEqual(false)
        expect(stateWithErrorClearedFromCreateSuccess.joinSessionFailure).toEqual(false)
    });
})
