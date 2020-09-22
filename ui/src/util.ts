export function getWebSocketURL() {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL
    }

    const url = new URL('/api', window.location.href);
    url.protocol = url.protocol.replace('http', 'ws');
    return url.href
}
