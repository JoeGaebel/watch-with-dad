import {ServerSocketEvent} from "../../ui/src/types/shared";
import {waitForTruth} from "./util";
import hash from "object-hash"

export default function buildSocketExpectation() {
    return new SocketExpectation()
}

interface Counter {
    value: number
}

class SocketExpectation<T extends ServerSocketEvent> {
    expectations: Array<Expectation<T>> = []
    expectationCounterMap: Map<WebSocket, Counter> = new Map<WebSocket, Counter>()
    handledEvents: Set<string> = new Set<string>()

    add(
        connection: WebSocket,
        expectedMessage: T,
        then?: () => void
    ): SocketExpectation<T> {
        if (!this.expectationCounterMap.get(connection)) {
            this.expectationCounterMap.set(connection, {value: 0})
        }

        const currentCount = this.expectationCounterMap.get(connection)

        const expectedCount = this.expectations
            .filter((expectation) => expectation.connection === connection)
            .length

        const newExpectation = new Expectation(
            connection,
            expectedMessage,
            currentCount!,
            expectedCount,
            this.handledEvents,
            then
        )

        this.expectations.push(newExpectation)
        return this
    }

    isComplete() {
        return this.expectations
            .every((expectation) => expectation.fulfilled)
    }

    async toComplete() {
        await waitForTruth(() => this.isComplete(), 1000)
    }
}

class Expectation<T extends ServerSocketEvent> {
    fulfilled: boolean = false
    connection: WebSocket

    constructor(
        connection: WebSocket,
        expectedMessage: T,
        currentCount: Counter,
        expectedCount: number,
        handledEvents: Set<string>,
        then?: () => void
    ) {
        this.connection = connection

        connection.addEventListener("message", (event: MessageEvent) => {
            const response = JSON.parse(event.data) as T

            if (handledEvents.has(hash(event))) {
                return
            }

            if (response.type != expectedMessage.type) {
                return
            }

            if(currentCount.value != expectedCount) {
                return
            }

            expect(response).toEqual(expectedMessage)
            if (then) then()

            this.fulfilled = true
            currentCount.value++
            handledEvents.add(hash(event))
        })
    }
}
