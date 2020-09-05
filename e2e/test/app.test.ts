import { Selector } from 'testcafe'

const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000'

fixture `Watch With Dad`
    .page(frontendURL);

const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

test('sends data across', async t => {
  const initialWindow = await t.getCurrentWindow();

  const secondWindow = await t.openWindow(frontendURL);

  await t.switchToWindow(initialWindow);

  await t.click(Selector("button").withText("Create Session"))

  const sessionId = (await Selector('div')
      .withText(/Connected to session!/)
      .innerText).match(uuidRegex)![0]

  await t.expect(Selector('#receive-message').value).eql('');

  await t.switchToWindow(secondWindow);

  await t.typeText("[data-testid='session-id']", sessionId)
  await t.click(Selector("button").withText("Join Session"))

  const randomMessage = `message-${Math.random() * 100}`
  await t.typeText("#send-message", randomMessage)
  await t.click(Selector("button").withText("Send"))

  await t.switchToWindow(initialWindow);
  await t.expect(Selector('#receive-message').value).eql(randomMessage);
});
