// tests/form.spec.js
import { test, expect } from '@playwright/test';

test.describe.serial('Home page form', () => {
  const BASE = 'http://localhost:3000/dashboard.html';
  let context;
  let page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Landing', async () => {
    // 1) Check name input
    const nameInput = page.getByRole('textbox', { name: 'Your Name:' });
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(nameInput).toHaveAttribute('pattern', '[^<>&]{0,100}');
    await nameInput.fill('Test User');

    // 2) Check create button
    const createBtn = page.getByRole('button', { name: 'Start Game as Admin' });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();

    // 3) Check join button
    const gameIdInput = page.locator('#game-id-input');
    const joinBtn = page.getByRole('button', { name: 'Join' });
    await expect(gameIdInput).toBeVisible();
    await expect(joinBtn).toBeVisible();

    // 4) Join: invalid game-ID (too short)
    await gameIdInput.fill('12');
    const shortValid = await gameIdInput.evaluate(el => el.validity.valid);
    expect(shortValid).toBe(false);

    // 5) Join: valid game-ID
    await gameIdInput.fill('123456');
    const longValid = await gameIdInput.evaluate(el => el.validity.valid);
    expect(longValid).toBe(true);

    await createBtn.click();
    await expect(page).toHaveURL(BASE);
  });

  // 6) website URL including 6 digit game ID
  const urlRegEx = new RegExp(`^${BASE}\\?gameId=\\d{6}$`, 'i');

  test('Add Items', async () => {
    const aceItems = page.locator('ace-items');
    await expect(aceItems).toBeVisible();

    // 1) Select page elements
    const itemInput = page.locator('#item-input');
    const addBtn = page.locator('#add-item-button');
    const listEl = page.locator('#item-list');

    // 2) initial list is pre-populated with 3 items
    await expect(listEl.locator('li')).toHaveCount(3);

    // 3) attempt to add an invalid item (contains '<')
    await itemInput.fill('Bad<item');
    await expect(addBtn).toBeDisabled();
    // should NOT add to list:
    await expect(listEl.locator('li')).toHaveCount(3);

    // 4) add a valid item
    await itemInput.fill('First New Item');
    await addBtn.click();
    await expect(listEl.locator('li')).toHaveCount(4);
    // new element will be the 6th because of pre-added items + additional spans for delete buttons
    await expect(listEl.locator('li span').nth(6)).toHaveText('First New Item');

    // 5) add a second valid item via Enter key
    await itemInput.fill('Second New Item');
    await itemInput.press('Enter');
    await expect(listEl.locator('li')).toHaveCount(5);
    await expect(listEl.locator('li span').nth(8)).toHaveText('Second New Item');

    // 6) test duplicate prevention
    await itemInput.fill('first new item');
    await addBtn.click();
    await expect(listEl.locator('li')).toHaveCount(5);

    // 7) remove the first item via its trash icon
    const firstTrash = listEl.locator('li .trash').first();
    await firstTrash.click();
    await expect(listEl.locator('li')).toHaveCount(4);
    await expect(listEl.locator('li span').nth(6)).toHaveText('Second New Item');

    // 8) "Next" button should be present and enabled now that we have items
    const nextBtn = aceItems.locator('#next-button');
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await expect(page).toHaveURL(urlRegEx);
  });

  test('Lobby', async () => {
    const aceLobby = page.locator('ace-lobby');
    await expect(aceLobby).toBeVisible();

    // 1) Check Participants list
    const participants = page.locator('#participants-list li');
    const partCount = await participants.count();
    expect(partCount).toBe(1);
    // ensure each has a name span
    await expect(page.locator('.participant-name')).toHaveCount(partCount);

    // 2) As admin, we should see the "Start Game" button
    const startGameBtn = page.locator('#start-game-button');
    await expect(startGameBtn).toBeVisible();
    await expect(startGameBtn).toBeEnabled();

    // 3) Check Items table headers
    const headers = page.locator('#items-table th');
    await expect(headers).toHaveText(['ID', 'Item']);

    // 4) Rows should match the items we left off with (4 rows)
    const rows = page.locator('#items-table tbody tr');
    await expect(rows).toHaveCount(4);

    // 5) Each row’s first cell must be its 1-based index
    for (let i = 0; i < 4; i++) {
      const idCell = rows.nth(i).locator('td').nth(0);
      await expect(idCell).toHaveText(String(i + 1));
    }

    // 6) Start game
    await startGameBtn.click();
    await expect(page).toHaveURL(urlRegEx);
  });

  const ITEMS = ['#062 - Mobile App Responsive Design', '#063 - Database Migration', 'First New Item', 'Second New Item'];
  const OPTIONS = [1, 2, 3, 5, 8, 13, 21];

  for (let round = 0; round < ITEMS.length; round++) {
    test('Voting #' + round, async () => {
      // 1) Check question/item name to be there
      const question = page.locator('.question');
      await expect(question).toHaveText(ITEMS[round]);

      const buttons = page.locator('.voting-buttons button');
      // low timeout, otherwise animation ends and buttons will show up => test fails
      await expect(buttons).toHaveCount(0, { timeout: 200 });

      // 2) wait for the container to get visible
      await page.waitForSelector('.voting-buttons.visible', { timeout: 4000 });
      // now all OPTIONS should be rendered
      await expect(buttons).toHaveCount(OPTIONS.length);
      for (const opt of OPTIONS) {
        const btn = page.locator(`button[aria-label="Vote ${opt}"]`);
        await expect(btn).toBeVisible();
      }

      // 3) click the "5" button
      const voteBtn = page.locator(`button[aria-label="Vote 5"]`);
      await voteBtn.click();
    });

    test('Results #' + round, async () => {
      // 1) Wait for results page to be visible
      const resultsRoot = page.locator('ace-results');
      await expect(resultsRoot).toBeVisible();

      // 2) Check the question header
      await expect(resultsRoot.locator('.question'))
        .toHaveText(ITEMS[round]);

      // 3) Check the average display
      await expect(resultsRoot.locator('.average-box'))
        .toHaveText('Average: 5');

      // 4) Check "Vote Details" heading
      await expect(resultsRoot.locator('h2'))
        .toHaveText('Vote Details');

      // 5) Check table headers
      await expect(resultsRoot.locator('table thead th'))
        .toHaveText(['Player', 'Vote']);

      // 6) Check that there’s exactly one row, and its contents
      const rows = resultsRoot.locator('tbody tr');
      await expect(rows).toHaveCount(1);
      const cells = rows.first().locator('td');
      await expect(cells.nth(0)).toHaveText('Test User');
      await expect(cells.nth(1)).toHaveText('5');

      // 7) Check "Repeat" button
      const repeatBtn = resultsRoot.locator('#repeat-button');
      await expect(repeatBtn).toBeVisible();
      await expect(repeatBtn).toBeEnabled();

      if (round != ITEMS.length - 1) {
        // 7) Check & click "Next" button
        const nextBtn = resultsRoot.locator('#next-button');
        await expect(nextBtn).toBeVisible();
        await expect(nextBtn).toBeEnabled();
        await nextBtn.click();
      } else {
        // 7) Check & click "Summary" button
        const summaryBtn = resultsRoot.locator('#summary-button');
        await expect(summaryBtn).toBeVisible();
        await expect(summaryBtn).toBeEnabled();
        await summaryBtn.click();
      }
    });
  }

  test('Summary', async () => {
    // 1) Wait for the summary component to be visible
    const summaryRoot = page.locator('ace-summary');
    await expect(summaryRoot).toBeVisible();

    // 2) Check the heading
    await expect(summaryRoot.locator('h2')).toHaveText('Sprint Summary');

    // 3) Grab all rows in the summary list (excluding the header)
    const rows = summaryRoot.locator('#summary-list tr');
    await expect(rows).toHaveCount(4);

    // 4) Check first and last item text + averages
    await expect(rows.nth(0).locator('td').nth(0)).toHaveText(ITEMS[0]);
    await expect(rows.nth(0).locator('td').nth(1)).toHaveText('5');
    await expect(rows.nth(3).locator('td').nth(0)).toHaveText(ITEMS[3]);
    await expect(rows.nth(3).locator('td').nth(1)).toHaveText('5');

    // 5) Check the totals output
    const totals = summaryRoot.locator('.total');
    await expect(totals).toHaveText(/4 Items • Average: 5 • Total: 20/);

    // 6) Click “Back to main page” and verify your landing form reappears
    const backBtn = summaryRoot.locator('#back-button');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // After going back, the home form’s name input should be visible again
    const nameInput = page.getByRole('textbox', { name: 'Your Name:' });
    await expect(nameInput).toBeVisible();
  });
});
