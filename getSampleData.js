const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless:false});
  const page = await browser.newPage();

  await page.goto('https://www.zalando.pl/login?target=/myaccount/', {
    waitUntil: 'networkidle0',
  });

  // Define a window.onCustomEvent function on the page.
  await page.exposeFunction('onCustomEvent', (e) => {
    console.log(`${e.type} fired`, e.detail || '');
  });

  /**
   * Attach an event listener to page to capture a custom event on page load/navigation.
   * @param {string} type Event name.
   * @returns {!Promise}
   */
  
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        window.onCustomEvent({ type, detail: e });
      });
    }, 'click');

  //await browser.close();
})();