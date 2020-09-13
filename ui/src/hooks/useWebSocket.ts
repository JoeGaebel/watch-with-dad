import {Dispatch, MutableRefObject, useEffect} from "react";
import {ConnectedToServerSuccessfully, ServerSocketEvent} from "../types/shared";

export default function useWebSocket(connection: MutableRefObject<WebSocket>, dispatch: Dispatch<ServerSocketEvent>) {
    function subscribeToSocketOpening() {
        connection.current.onopen = () => {
            const event = new ConnectedToServerSuccessfully()
            dispatch(event)
        }
    }

    function subscribeToSocketMessage() {
        connection.current.onmessage = (event: MessageEvent) => {
            try {
                const parsedEvent = JSON.parse(event.data) as ServerSocketEvent
                dispatch(parsedEvent)
            } catch (error) {
            }
        }
    }

    useEffect(() => {
        subscribeToSocketOpening();
        subscribeToSocketMessage();
    })
}