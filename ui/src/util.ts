export function getWebSocketURL() {
    const url = new URL('/api', window.location.href);
    url.protocol = url.protocol.replace('http', 'ws');
    return url.href
}
