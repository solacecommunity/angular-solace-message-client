import {browser} from 'protractor';

describe('Solace Message Client', () => {

  it('should have a working end-to-end test setup', async () => {
    await browser.get('/angular-solace-message-client/tryme');
    await expect(await browser.getTitle()).toEqual('Angular Solace Message Client');
  });
});
