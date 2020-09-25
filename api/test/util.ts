export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForTruth(test: () => boolean, attempts: number): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        let i = 0;
        while (i < attempts) {
            if (test()) {
                return resolve()
            }

            await sleep(50)
            i++
        }
        fail("Ran out of attempts")
        reject()
    })
}
