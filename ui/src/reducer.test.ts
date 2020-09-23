import {getReducer, initialState} from "./reducer";
import {MutableRefObject, useRef} from "react";
import SocketMessenger from "./SocketMessenger";
import {ServerMessage} from "./types/shared";
import { renderHook } from '@testing-library/react-hooks'

describe("reducer", () => {
    it('gracefully handles safari`s play shenanigans', () => {
        const fakeVideo = {play: jest.fn(), pause: jest.fn()}
        const fakeSocketMessenger = {setJustReceivedMessage: jest.fn()}

        fakeVideo.play.mockRejectedValue(null)

        const videoRef = renderHook(() => useRef(fakeVideo)).result.current as unknown as MutableRefObject<HTMLVideoElement | null>
        const socketMessenger = renderHook(() => useRef(fakeSocketMessenger)).result.current as unknown as MutableRefObject<SocketMessenger>

        const reducer = getReducer(videoRef, socketMessenger)
        const event = new ServerMessage("PLAY")

        expect(() => reducer(initialState, event)).not.toThrow()
    });
})
