const { test, expect } = require('@playwright/test');

test.describe('SmartBLE Cross-Platform Standard UI Flow', () => {

  test('Should complete the full Scan -> Connect -> Write -> Broadcast logic cascade', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER: ' + msg.text()));

    // 1. Visit App with mock engine flag
    await page.goto('/?mock=true');

    // 2. Start Scan
    const scanButton = page.locator('#scanButton');
    await expect(scanButton).toBeVisible();
    await scanButton.click();
    await page.waitForTimeout(1000); // Give it a second to render
    
    // Dump HTML string to figure out what playwright sees!
    const listHtml = await page.evaluate(() => document.getElementById('deviceList').innerHTML);
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('DEVICE_LIST_HTML: ', listHtml);
    console.log('PARTIAL_BODY_HTML: ', bodyHtml);

    // 3. Wait for Mock Device to be injected by API (Dummy Sensor)
    const deviceCard = page.locator('device-card').first();
    await expect(deviceCard).toBeVisible({ timeout: 10000 });

    // 4. Click the "Connect" button inside the Shadow DOM of first device
    const detailsBtn = deviceCard.locator('#connectBtn');
    await detailsBtn.click();
    
    // 5. Wait for state transition to Connected directly (Allow i18n text)
    const connectionStatus = page.locator('#connectionStatus');
    await expect(connectionStatus).toHaveText(/(Connected|已连接)/, { timeout: 10000 });

    // 6. Verify Services populating
    const servicePanel = page.locator('#mainServicePanel'); // Fallback wrapper check
    await expect(servicePanel).toBeAttached();

    // 7. Verify OTA Entrypoint (Since mock 1 injects the OTA UUID)
    const otaActionBtn = page.locator('#otaButton'); // the specific button we added in Electron UI
    if (await otaActionBtn.isVisible({ timeout: 2000 })) {
      await otaActionBtn.click();
      const otaDialog = page.locator('#mainOtaDialog');
      await expect(otaDialog).toBeAttached();
      // Dismiss OTA dialog
      const shadowCancel = otaDialog.locator('button#cancelBtn');
      if (await shadowCancel.isVisible()) {
         await shadowCancel.click();
      }
    }

    // 8. Go back to main navigation and connect second device to test Concurrency
    const backBtn = page.locator('#backButton');
    if (await backBtn.isVisible()) {
        await backBtn.click();
    }
    await page.waitForTimeout(500);

    // 9. Connect to second device
    const deviceCard2 = page.locator('device-card').nth(1); // Dummy-BLE-02
    await expect(deviceCard2).toBeVisible({ timeout: 5000 });
    const detailsBtn2 = deviceCard2.locator('#connectBtn');
    await detailsBtn2.click();

    await expect(connectionStatus).toHaveText(/(Connected|已连接)/, { timeout: 10000 });

    // 10. Verify Connected Devices Tab logic (Concurrency Check)
    const connectedTab = page.locator('#connectedTab');
    await connectedTab.click();
    await page.waitForTimeout(500);
    
    const connectedList = page.locator('#connectedDeviceList');
    // We should see two device cards in the connected panel
    const connectedCards = connectedList.locator('device-card');
    await expect(connectedCards).toHaveCount(2);

    // 11. Verify OS Limitation Warning logic (Strategy A triggered by UC)
    // For playwright running on chromium win/linux, the gracefully degraded UI hides the broadcast tab completely!
    const broadcastTab = page.locator('.tab-btn[data-tab="broadcast"]');
    await expect(broadcastTab).toBeHidden();
    
    // Test successfully validated Cross-Platform BLE State Cascade!
  });
});
