import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { calculateDailyDeduction } from '../packages/domain/src/subscription';
import { calculateTopUp } from '../packages/domain/src/stabilisation';
import { calculateVestingPercentage } from '../packages/domain/src/vesting';

const root = resolve(process.cwd());
const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const formatKobo = (kobo: number) => currency.format(kobo / 100);

let serverProcess: ChildProcessWithoutNullStreams | undefined;
let simulatorUrl: string;

const presets = [
  {
    name: 'Free Day',
    gross: 320_000,
    today: 2,
    hours: 3.5,
    lifetime: 120,
    expectedFee: 0,
    expectedTopUp: 0,
    expectedVesting: 0,
  },
  {
    name: 'Top-Up Eligible',
    gross: 1_400_000,
    today: 9,
    hours: 10.5,
    lifetime: 350,
    expectedFee: 150_000,
    expectedTopUp: 300_000,
    expectedVesting: 50,
  },
  {
    name: 'Max Cap & Vested',
    gross: 3_500_000,
    today: 14,
    hours: 10,
    lifetime: 750,
    expectedFee: 150_000,
    expectedTopUp: 0,
    expectedVesting: 100,
  },
];

test.beforeAll(async () => {
  const child = spawn(process.execPath, ['scripts/dev-hub.cjs'], {
    cwd: root,
    env: { ...process.env, DEV_HUB_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess = child;

  await new Promise<void>((resolveReady, reject) => {
    let output = '';
    let errorOutput = '';
    let settled = false;
    const startupTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Developer hub did not start. ${output}${errorOutput}`));
    }, 10_000);

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(startupTimeout);
      reject(error);
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      const match = output.match(/listening on port (\d+)/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(startupTimeout);
      simulatorUrl = `http://127.0.0.1:${match[1]}/simulator`;
      resolveReady();
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      errorOutput += chunk;
    });
    child.once('error', fail);
    child.once('exit', (code, signal) => {
      if (!settled) {
        fail(
          new Error(
            `Developer hub exited before startup (code ${code}, signal ${signal}). ${errorOutput}`,
          ),
        );
      }
    });
  });
});

test.afterAll(async () => {
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null)
    return;
  await new Promise<void>((resolveExit) => {
    serverProcess?.once('exit', () => resolveExit());
    serverProcess?.kill('SIGTERM');
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto(simulatorUrl);
});

async function verifyRequiredDocuments(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Mock documents' }).click();
  await page.locator('#document-list input[type="checkbox"]').nth(2).check();
  await page.getByRole('button', { name: 'Submit mock documents' }).click();
  await page.getByRole('button', { name: 'Simulate verification' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
}

async function createOffer(page: import('@playwright/test').Page) {
  await verifyRequiredDocuments(page);
  await page.getByRole('button', { name: 'Go mock online' }).click();
  await page.getByRole('button', { name: 'Simulate ₦4,500 offer' }).click();
}

async function completeTrip(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Accept mock offer' }).click();
  await page.getByRole('button', { name: 'Arrived at pickup' }).click();
  await page.getByRole('button', { name: 'Start mock trip' }).click();
}

async function clickAtDisabledButton(
  page: import('@playwright/test').Page,
  button: import('@playwright/test').Locator,
) {
  const bounds = await button.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('Expected the disabled preset button to be visible.');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function readCounters(page: import('@playwright/test').Page) {
  return {
    gross: await page.locator('#gross').innerText(),
    today: await page.locator('#trips-today').innerText(),
    lifetime: await page.locator('#vesting-label').innerText(),
  };
}

test('requires every required mock document to be verified before going online', async ({
  page,
}) => {
  const onlineButton = page.getByRole('button', { name: 'Go mock online' });
  await expect(onlineButton).toBeDisabled();
  await expect(page.locator('#compliance-status')).toContainText('NHIA');

  await verifyRequiredDocuments(page);
  await expect(onlineButton).toBeEnabled();
  await onlineButton.click();
  await expect(page.locator('#online-status')).toHaveText('Mock online');
});

test('credits one ₦4,500 trip once even when the completion button is double-clicked', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Free Day', exact: true }).click();
  await expect(page.locator('#gross')).toHaveText(formatKobo(320_000));
  await expect(page.locator('#trips-today')).toHaveText('2');
  await expect(page.locator('#vesting-label')).toHaveText('0% · 120 / 750 trips');
  await createOffer(page);
  await completeTrip(page);

  const completeButton = page.locator('#complete-trip');
  const bounds = await completeButton.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('Expected the active trip completion button to be visible.');
  await page.mouse.dblclick(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

  await expect(page.locator('#gross')).toHaveText(formatKobo(770_000));
  await expect(page.locator('#trips-today')).toHaveText('3');
  await expect(page.locator('#vesting-label')).toHaveText('0% · 121 / 750 trips');
  await expect(page.locator('#trip-panel')).toBeHidden();
  expect(770_000 - 320_000).toBe(450_000);
});

test('declining, cancelling, and expiring offers do not add earnings or completed trips', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00') });
  await page.reload();
  await page.getByRole('button', { name: 'Free Day', exact: true }).click();
  await createOffer(page);
  const baseline = await readCounters(page);

  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.locator('#offer-panel')).toBeHidden();
  await expect.poll(() => readCounters(page)).toEqual(baseline);

  await page.getByRole('button', { name: 'Simulate ₦4,500 offer' }).click();
  await completeTrip(page);
  await page.getByRole('button', { name: 'Cancel mock trip' }).click();
  await expect(page.locator('#trip-panel')).toBeHidden();
  await expect.poll(() => readCounters(page)).toEqual(baseline);

  await page.getByRole('button', { name: 'Simulate ₦4,500 offer' }).click();
  await page.clock.fastForward(10 * 60 * 1000);
  await expect(page.locator('#message')).toHaveText('The mock offer expired. No earnings changed.');
  await expect(page.locator('#offer-panel')).toBeHidden();
  await expect.poll(() => readCounters(page)).toEqual(baseline);
});

test('presets cannot replace earnings during an offer or active trip', async ({ page }) => {
  await page.getByRole('button', { name: 'Free Day', exact: true }).click();
  const baseline = await readCounters(page);
  await createOffer(page);

  const topUpPreset = page.getByRole('button', { name: 'Top-Up Eligible', exact: true });
  await expect(topUpPreset).toBeDisabled();
  await clickAtDisabledButton(page, topUpPreset);
  await expect.poll(() => readCounters(page)).toEqual(baseline);

  await completeTrip(page);
  await expect(topUpPreset).toBeDisabled();
  await clickAtDisabledButton(page, topUpPreset);
  await expect.poll(() => readCounters(page)).toEqual(baseline);
  await expect(page.locator('#trip-panel')).toBeVisible();
});

for (const preset of presets) {
  test(`${preset.name} matches fee, top-up, and vesting domain calculations`, async ({ page }) => {
    await page.getByRole('button', { name: preset.name, exact: true }).click();

    const feeKobo = calculateDailyDeduction(preset.gross);
    const topUpKobo = calculateTopUp(preset.gross, preset.hours, preset.today);
    const vestingPercent = calculateVestingPercentage(preset.lifetime);
    expect(feeKobo).toBe(preset.expectedFee);
    expect(topUpKobo).toBe(preset.expectedTopUp);
    expect(vestingPercent).toBe(preset.expectedVesting);

    await expect(page.locator('#gross')).toHaveText(formatKobo(preset.gross));
    await expect(page.locator('#fee')).toHaveText(
      preset.gross < 400_000 ? 'Free day' : formatKobo(feeKobo),
    );
    await expect(page.locator('#pool')).toHaveText(formatKobo(feeKobo));
    await expect(page.locator('#topup')).toHaveText(formatKobo(topUpKobo));
    await expect(page.locator('#vesting-label')).toHaveText(
      `${vestingPercent}% · ${preset.lifetime} / 750 trips`,
    );
  });
}

test('reset restores the initial mock state', async ({ page }) => {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reports' }).click();
  await page.locator('#report-description').fill('Mock incident details');
  await page.getByRole('button', { name: 'Save mock report in memory' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Max Cap & Vested', exact: true }).click();
  await verifyRequiredDocuments(page);
  await page.getByRole('button', { name: 'Go mock online' }).click();

  await page.getByRole('button', { name: 'Reset all mock data' }).click();

  await expect(page.locator('#online-status')).toHaveText('Mock offline');
  await expect(page.locator('#gross')).toHaveText(formatKobo(0));
  await expect(page.locator('#trips-today')).toHaveText('0');
  await expect(page.locator('#vesting-label')).toHaveText('0% · 0 / 750 trips');
  await expect(page.locator('#compliance-status')).toContainText('NHIA');
  await expect(page.locator('#document-list')).toContainText('Missing mock upload');
  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.locator('#report-list')).toHaveText('No mock reports saved.');
});

test('refresh clears all mock state', async ({ page }) => {
  await page.getByRole('button', { name: 'Top-Up Eligible', exact: true }).click();
  await verifyRequiredDocuments(page);
  await page.getByRole('button', { name: 'Go mock online' }).click();
  await page.getByRole('button', { name: 'Mock reports' }).click();
  await page.locator('#report-description').fill('Mock report before refresh');
  await page.getByRole('button', { name: 'Save mock report in memory' }).click();

  await page.reload();

  await expect(page.locator('#online-status')).toHaveText('Mock offline');
  await expect(page.locator('#gross')).toHaveText(formatKobo(0));
  await expect(page.locator('#trips-today')).toHaveText('0');
  await expect(page.locator('#vesting-label')).toHaveText('0% · 0 / 750 trips');
  await expect(page.locator('#compliance-status')).toContainText('NHIA');
  await expect(page.locator('#document-list')).toContainText('Missing mock upload');
  await page.getByRole('button', { name: 'Mock reports' }).click();
  await expect(page.locator('#report-list')).toHaveText('No mock reports saved.');
});
