import {MutableRefObject, useEffect, useRef} from "react";
import SocketMessenger from "../SocketMessenger";
import {getWebSocketURL} from "../util";

export function useWebSocket() {
    const connection: MutableRefObject<WebSocket | null> = useRef(null)
    const socketMessenger: MutableRefObject<SocketMessenger | null> = useRef(null)

    useEffect(() => {
        connection.current = new WebSocket(getWebSocketURL())
        socketMessenger.current = new SocketMessenger(connection)
    }, [])

    return {connection, socketMessenger};
}
