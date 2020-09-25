import {Selector} from 'testcafe'
import * as path from "path"

const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000'
const topgun = path.resolve("../topgun.mp4")

fixture `Watch With Dad`
    .page(frontendURL);

function getVideoPaused(t: TestController): Promise<boolean> {
  return t.eval(() => (document.getElementById("video") as HTMLVideoElement).paused)
}

function playVideo(t: TestController) {
  return t.eval(() => (document.getElementById("video") as HTMLVideoElement).play())
}

function pauseVideo(t: TestController) {
  return t.eval(() => (document.getElementById("video") as HTMLVideoElement).pause())
}

function seekVideo(t: TestController) {
  return t.eval(() => (document.getElementById("video") as HTMLVideoElement).currentTime = 30.01)
}

function getCurrentTime(t: TestController): Promise<number> {
  return t.eval(() => (document.getElementById("video") as HTMLVideoElement).currentTime)
}

test('plays and pauses in sync', async (t: TestController) => {
  const initialWindow = await t.getCurrentWindow();
  const secondWindow = await t.openWindow(frontendURL);

  await t.switchToWindow(initialWindow);

  await t.click(Selector("button").withText("Create Session"))

  const sessionId = (await Selector('[data-testid="session-id"]').innerText)

  await t.expect(Selector("video").visible).eql(false)

  await t.setFilesToUpload("input", topgun)

  await t.expect(Selector("video").visible).eql(true)

  const isInitialVideoPaused = await getVideoPaused(t)
  await t.expect(isInitialVideoPaused).eql(true)

  await t.switchToWindow(secondWindow);

  await t.typeText("[data-testid='session-id']", sessionId)
  await t.click(Selector("button").withText("Join Session"))

  await t.setFilesToUpload("input", topgun)

  await playVideo(t)
  const isSecondaryVideoPaused = await getVideoPaused(t)
  await t.expect(isSecondaryVideoPaused).eql(false)

  await t.switchToWindow(initialWindow);
  const isInitialVideoPausedNow = await getVideoPaused(t)
  await t.expect(isInitialVideoPausedNow).eql(false)

  await pauseVideo(t)
  await t.expect(await getVideoPaused(t)).eql(true)

  await t.switchToWindow(secondWindow);
  await t.expect(await getVideoPaused(t)).eql(true)

  const currentTimeSecondWindow = await getCurrentTime(t)
  await t.expect(currentTimeSecondWindow).notEql(30.01)

  await seekVideo(t)
  const updatedTimeSecondWindow = await getCurrentTime(t)
  await t.expect(updatedTimeSecondWindow).eql(30.01)

  await t.switchToWindow(initialWindow);
  await t.expect(await getCurrentTime(t)).eql(30.01)

  await t.expect(Selector("div").withText("👨‍💻👨‍💻").exists).eql(true)
});
