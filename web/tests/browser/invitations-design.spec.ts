import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';

test('invitation filters, readable cards and recoverable empty states fit phone, tablet and desktop', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await request.post(fixture + '/__test__/education-case', {
    data: {
      invitations: [
        {
          id: ids.class,
          organizationName: 'آموزشگاه هنر و مهارت‌های کاربردی ماکان با نام بلند',
          role: 'Student',
          status: 'Pending',
          expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: ids.exam,
          organizationName: 'آموزشگاه پذیرفته‌شده',
          role: 'Student',
          status: 'Accepted',
          expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: ids.lesson,
          organizationName: 'دعوت منقضی‌شده',
          role: 'Student',
          status: 'Pending',
          expiresAtUtc: '2020-01-01T00:00:00Z',
        },
      ],
    },
  });
  await page.goto('/personal/education/invitations');
  const panel = page.getByRole('region', { name: 'دعوت‌های دریافتی', exact: true });
  const filters = panel.getByRole('navigation', { name: 'وضعیت دعوت', exact: true });
  await expect(panel.getByRole('article')).toHaveCount(3);
  await expect(panel.getByRole('status')).toHaveText('۳ دعوت');
  await filters.getByRole('button', { name: 'در انتظار', exact: true }).click();
  await expect(panel.getByRole('article')).toHaveCount(1);
  await expect(panel).not.toContainText('دعوت منقضی‌شده');
  await mkdir('output/review/invitations-redesign', { recursive: true });
  for (const width of [320, 390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await filters.getByRole('button', { name: 'همه', exact: true }).click();
    const bounds = await filters.getByRole('button').evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { y: r.y, height: r.height, width: r.width };
      }),
    );
    expect(new Set(bounds.map((b) => b.y)).size).toBe(1);
    expect(bounds.every((b) => b.height >= 44 && b.width >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/review/invitations-redesign/cards-${width}.png`,
      fullPage: true,
    });
    await filters.getByRole('button', { name: 'ردشده', exact: true }).click();
    await expect(
      panel.getByRole('heading', { name: 'دعوت ردشده‌ای ندارید', exact: true }),
    ).toBeVisible();
    await expect(panel.getByRole('article')).toHaveCount(0);
    await expect(filters.getByRole('button', { name: 'ردشده', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.screenshot({
      path: `output/review/invitations-redesign/empty-${width}.png`,
      fullPage: true,
    });
    await panel.getByRole('button', { name: 'نمایش همهٔ دعوت‌ها', exact: true }).click();
    await expect(panel.getByRole('article')).toHaveCount(3);
  }
  await request.post(fixture + '/__test__/education-case', { data: { invitations: [] } });
  await page.getByRole('button', { name: 'دریافت دوبارهٔ دعوت‌ها', exact: true }).click();
  await expect(
    panel.getByRole('heading', { name: 'هنوز دعوتی دریافت نکرده‌اید', exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole('button', { name: 'نمایش همهٔ دعوت‌ها', exact: true })).toHaveCount(
    0,
  );
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.goto('/personal/education/invitations');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    panel.getByRole('heading', { name: 'هنوز دعوتی دریافت نکرده‌اید', exact: true }),
  ).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/review/invitations-redesign/empty-dark-${width}.png`,
      fullPage: true,
    });
  }
});
