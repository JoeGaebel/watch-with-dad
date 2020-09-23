import {Dispatch, MutableRefObject, useEffect} from "react";
import {ConnectedToServerSuccessfully, ServerSocketEvent} from "../types/shared";

export default function useWebSocket(connection: MutableRefObject<WebSocket | null>, dispatch: Dispatch<ServerSocketEvent>) {
    useEffect(() => {
        function subscribeToSocketOpening() {
            if (!connection.current) { return }
            connection.current.onopen = () => {
                const event = new ConnectedToServerSuccessfully()
                dispatch(event)
            }
        }

        function subscribeToSocketMessage() {
            if (!connection.current) { return }
            connection.current.onmessage = (event: MessageEvent) => {
                try {
                    const parsedEvent = JSON.parse(event.data) as ServerSocketEvent
                    dispatch(parsedEvent)
                } catch (error) {
                }
            }
        }

        subscribeToSocketOpening();
        subscribeToSocketMessage();
    }, [connection, dispatch])
}
