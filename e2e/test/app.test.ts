import { Selector } from 'testcafe'

const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000'

fixture `Watch With Dad`
    .page(frontendURL);

test('sends data across', async t => {
  const initialWindow = await t.getCurrentWindow();

  const secondWindow = await t.openWindow(frontendURL);
  await t.expect(Selector('#receive-message').value).eql('');

  await t.switchToWindow(initialWindow);


  const randomMessage = `message-${Math.random() * 100}`
  await t.typeText("#send-message", randomMessage)
  await t.click("button")

  await t.switchToWindow(secondWindow);
  await t.expect(Selector('#receive-message').value).eql(randomMessage);
});
