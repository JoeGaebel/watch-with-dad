import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react';
import App from './App';
import * as WebSocket from 'ws'


describe('App', () => {
    const fakeBackendPort = 9999
    let server: WebSocket.Server

    beforeEach(() => {
        process.env.BACKEND_URL = `ws://localhost:${fakeBackendPort}`
    })

    afterEach(async () => {
        await new Promise((resolve, _) => {
            server.close(() => resolve())
        })
    })

    function createServer() {
        server = new WebSocket.Server({port: fakeBackendPort})
    }

    it('opens a web socket', (done) => {
        createServer();

        render(<App/>)

        server.on("connection", () => {
            server.close()
            done()
        })
    });

    it('says when its connected', async () => {
        createServer();

        const {getByText} = render(<App/>)
        const status = getByText("Connecting...")
        expect(status).not.toBeEmpty()

        await waitFor(() => {
            expect(getByText('Connected!')).toBeInTheDocument()
        })
    });

    it('sends the data of the textbox to the server', async (done) => {
        createServer();
        const expectedMessage = 'good day mate!'

        server.on("connection", (connection) => {
            connection.on("message", (data) => {
                expect(data).toEqual(expectedMessage)
                done()
            })
        })

        const {getByTestId, getByText} = render(<App/>)

        await waitFor(() => {
            expect(getByText('Connected!')).toBeInTheDocument()
        })

        fireEvent.change(getByTestId("send-message"), {target: {value: expectedMessage}})
        fireEvent.click(getByTestId("button"))
    });

    it('receives the data from the server', async () => {
        createServer();

        server.on("connection", (connection) => {
            connection.send("Hello there!")
            connection.send("Cool guy!!")
        })

        const {getByTestId} = render(<App/>)

        await waitFor(() => {
            const text = getByTestId("receive-message")
                .getAttribute("value")
            expect(text).toEqual("Hello there!<br/>Cool guy!!")
        })
    });
})

