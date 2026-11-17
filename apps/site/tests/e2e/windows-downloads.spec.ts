import englishLocale from '@node-core/website-i18n/locales/en.json' with { type: 'json' };
import { test, expect } from '@playwright/test';

test.describe('Native Windows installation methods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/download');
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'Windows', exact: true }).click();
    await expect(page.getByRole('combobox').nth(2)).toHaveText('fnm');
  });

  test('uses the instruction architecture for exact WinGet installs', async ({
    page,
  }) => {
    const architectureLabel = page.getByText(
      englishLocale.layouts.download.codeBox.architecture,
      { exact: true }
    );
    await expect(architectureLabel).toHaveCount(0);

    await page.getByRole('combobox').nth(2).click();
    await page.getByRole('option', { name: 'WinGet', exact: true }).click();
    const architecture = architectureLabel.locator('..').getByRole('combobox');
    await architecture.click();
    await page.getByRole('option', { name: 'x64', exact: true }).click();

    await expect(page.locator('main code').first()).toContainText(
      /winget install --id OpenJS\.NodeJS\.LTS --exact --source winget --version \d+\.\d+\.\d+ --architecture x64/
    );
  });

  test('changes the nvm-windows installer to the selected architecture', async ({
    page,
  }) => {
    await page.getByRole('combobox').nth(2).click();
    await page
      .getByRole('option', { name: 'nvm-windows', exact: true })
      .click();
    const architecture = page
      .getByText(englishLocale.layouts.download.codeBox.architecture, {
        exact: true,
      })
      .locator('..')
      .getByRole('combobox');
    const code = page.locator('main code').first();

    for (const [label, platform] of [
      ['x64', 'x64'],
      ['ARM64', 'arm64'],
    ]) {
      await architecture.click();
      await page.getByRole('option', { name: label, exact: true }).click();
      await expect(code).toContainText(`nvm-2.0.1-${platform}-setup.exe`);
      await expect(code).toContainText(/nvm install \d+\.\d+\.\d+/);
      await expect(code).toContainText(/nvm use \d+\.\d+\.\d+/);
    }
  });
});
