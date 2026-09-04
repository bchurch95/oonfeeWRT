import { expect, test, type Locator, type Page } from '@playwright/test'

import { accounts, clientPage, dashboard, radios, site, speedTests, topology } from './fixtures'
async function installControllerFixture(page: Page, topologyResponse: unknown = topology) {
  const unexpectedRequests: string[] = []
  await page.addInitScript(() => {
    class FixtureWebSocket {
      static readonly OPEN = 1
      readyState = 0
      onopen: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onclose: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      constructor() {
        queueMicrotask(() => {
          this.readyState = FixtureWebSocket.OPEN
          this.onopen?.(new Event('open'))
        })
      }

      send() {}

      close() {
        this.readyState = 3
        this.onclose?.(new Event('close'))
      }
    }
    Object.defineProperty(window, 'WebSocket', { value: FixtureWebSocket })
  })

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:4173') {
      unexpectedRequests.push(`${route.request().method()} ${url.href}`)
      await route.abort('blockedbyclient')
      return
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue()
      return
    }
    const path = url.pathname
    const responses: Record<string, unknown> = {
      '/api/v1/setup': { needs_setup: false },
      '/api/v1/session': {
        admin_id: 1,
        username: 'operator',
        role: 'owner',
        role_label: 'Owner',
        csrf: 'fixture',
        reauthenticated_until: null,
      },
      '/api/v1/dashboard': dashboard,
      '/api/v1/devices': { devices: [] },
      '/api/v1/clients': clientPage,
      '/api/v1/events': {
        events: [{
          ID: 1,
          TS: 1_788_000_000,
          DeviceID: 1,
          Category: 'system',
          Severity: 'warning',
          Event: 'openwrt.ipv6_ra_no_default_route',
          Detail: {
            message: 'odhcpd[81]: No default route present, setting ra_lifetime to 0!',
            priority: 28,
            occurrences: 37,
          },
          Source: 'openwrt-logd',
          SourceID: '81',
          SourceBoot: 'fixture',
          IngestedAt: 1_788_000_000_000,
          ClientMAC: '',
          Action: '',
          Direction: '',
          InIface: '',
          OutIface: '',
          SrcIP: '',
          DstIP: '',
          SrcPort: null,
          DstPort: null,
          ZoneIn: '',
          ZoneOut: '',
          PolicyID: null,
        }],
        total: 1,
        limit: 100,
        scope: 'general',
        next_before: null,
        facets: { category: [], severity: [] },
        coverage: { complete: true, expected_devices: 0, observed_devices: 0, gaps: [] },
      },
      '/api/v1/speedtests': speedTests,
      '/api/v1/topology': topologyResponse,
      '/api/v1/site': site,
      '/api/v1/accounts': accounts,
      '/api/v1/radios': radios,
      '/api/v1/roaming/neighbours': { ran: false },
      '/api/v1/site/mesh-health': { links: [], note: 'No configured mesh links.' },
    }
    const body = path.startsWith('/api/v1/stats/')
      ? { device_id: 7, kind: path.split('/').at(-1), key: 'radio0', resolution: '5m', points: [] }
      : responses[path]
    if (route.request().method() !== 'GET' || body === undefined) {
      unexpectedRequests.push(`${route.request().method()} ${path}`)
      await route.fulfill({ status: 500, json: { error: `unmocked fixture route: ${path}` } })
      return
    }
    await route.fulfill({
      status: 200,
      json: body,
      headers: { 'X-OonfeeWRT-Instance': 'desktop-layout-fixture' },
    })
  })
  return unexpectedRequests
}

async function readOverflow(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('#main-content')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : Number.POSITIVE_INFINITY,
    }
  })
}

async function expectWithinMain(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  const [main, element] = await Promise.all([
    page.locator('#main-content').boundingBox(),
    locator.boundingBox(),
  ])
  expect(main).not.toBeNull()
  expect(element).not.toBeNull()
  expect(element!.x).toBeGreaterThanOrEqual(main!.x - 1)
  expect(element!.x + element!.width).toBeLessThanOrEqual(main!.x + main!.width + 1)
}

async function contrastRatio(locator: Locator) {
  return locator.evaluate((element) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    const luminance = (value: string) => {
      const [red, green, blue] = rgb(value).map((channel) => {
        const normalized = channel / 255
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4
      })
      return .2126 * red + .7152 * green + .0722 * blue
    }
    const style = getComputedStyle(element)
    const foreground = luminance(style.color)
    const background = luminance(style.backgroundColor)
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)
  })
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  for (const theme of ['dark', 'light'] as const) {
    test(`${viewport.width}x${viewport.height} ${theme} Dashboard fits and discloses by keyboard`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const unexpectedRequests = await installControllerFixture(page)
      await page.goto('/')

      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
      // The sidebar rests expanded, which is the widest nav and the narrowest
      // content — the worst case the fit assertions below are written for.
      await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible()
      if (theme === 'light') await page.getByRole('button', { name: /switch to light theme/i }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.getByText('fixture.warning')).toBeVisible()
      await expect(page.getByText('Complete coverage')).toBeVisible()

      const health = page.getByRole('region', { name: 'Internet health details' })
      const healthCharts = health.locator('.dashboard-wan-metrics')
      await expect(healthCharts.getByRole('img')).toHaveCount(4)
      await expect(page.getByLabel(/Throughput history for 3 completed tests/)).toBeVisible()
      expect(await healthCharts.evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(2)
      const operationCards = page.locator('.dashboard-operations-grid > section')
      await expect(operationCards).toHaveCount(2)
      const cardHeights = await operationCards.evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().height))
      expect(Math.abs(cardHeights[0] - cardHeights[1])).toBeLessThanOrEqual(1)

      const healthView = health.getByRole('group', { name: 'Internet health history view' })
      await healthView.getByRole('button', { name: 'Table' }).click()
      const healthTable = health.getByRole('region', { name: 'Internet health history table' })
      await expect(healthTable.getByRole('row')).toHaveCount(73)
      await expectWithinMain(page, healthTable)
      await healthView.getByRole('button', { name: 'Chart' }).click()

      const overflow = await readOverflow(page)
      expect(overflow.document).toBeLessThanOrEqual(1)
      expect(overflow.main).toBeLessThanOrEqual(1)

      const noticeSummary = page.locator('.notice-summary', {
        hasText: 'Current scoped evidence',
      })
      const lines = await noticeSummary.evaluate((element) => {
        const style = getComputedStyle(element)
        return element.getBoundingClientRect().height / Number.parseFloat(style.lineHeight)
      })
      expect(lines).toBeLessThanOrEqual(2.1)

      const disclosure = page
        .getByRole('group', { name: 'Information: Dashboard metrics' })
        .locator('button[aria-haspopup="dialog"]')
      await expect(disclosure).toHaveAccessibleName('How these counts are calculated')
      const details = page.getByText(/“Wireless clients” is the same count/)
      await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
      await expect(details).toBeHidden()
      await disclosure.focus()
      await disclosure.press('Enter')
      await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
      const metricDialog = page.getByRole('dialog', { name: 'Information: Dashboard metrics' })
      await expect(metricDialog).toBeVisible()
      await expect(metricDialog.getByRole('button', {
        name: 'Close Information: Dashboard metrics',
      })).toBeFocused()
      await expectWithinMain(page, metricDialog)
      await expect(metricDialog.getByText(/“Wireless clients” is the same count/)).toBeVisible()
      const expandedOverflow = await readOverflow(page)
      expect(expandedOverflow.document).toBeLessThanOrEqual(1)
      expect(expandedOverflow.main).toBeLessThanOrEqual(1)
      await page.keyboard.press('Escape')
      await expect(metricDialog).toBeHidden()
      await expect(disclosure).toBeFocused()
      expect(unexpectedRequests).toEqual([])
    })
  }
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`${viewport.width}px routine help and speed-test impact stay compact`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const unexpectedRequests = await installControllerFixture(page)

    await page.goto('/')
    // The sidebar rests expanded on wide viewports; these compactness
    // thresholds were tuned at the wide content width, so measure there.
    if (viewport.width >= 1000) {
      await page.getByRole('button', { name: 'Collapse navigation' }).click()
      await page.waitForTimeout(120)
    }
    const speed = page.getByRole('group', { name: 'Controller speed test' })
    const metrics = page.getByRole('group', { name: 'Information: Dashboard metrics' })
    await expectWithinMain(page, speed)
    await expect(metrics).toHaveAttribute('data-compact', 'true')
    await expectWithinMain(page, metrics)
    const run = speed.getByRole('button', { name: 'Run speed test' })
    const impact = speed.getByRole('button', { name: 'Impact & consent' })
    await expect(run).toBeVisible()
    await expect(run).toHaveAttribute('aria-describedby', /.+/)
    await expect(speed).toContainText(/15 MB \+ overhead.*30 seconds.*no router calls or changes.*public IP/i)
    await expect(speed.getByRole('checkbox')).toHaveCount(0)
    await impact.click()
    const impactDialog = page.getByRole('dialog', { name: 'Speed test impact & consent' })
    await expect(impactDialog).toBeVisible()
    await expectWithinMain(page, impactDialog)
    await page.mouse.move(2, viewport.height - 2)
    await expect(impactDialog).toBeHidden()
    await impact.focus()
    await impact.press('Enter')
    await expect(impactDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(impactDialog).toBeHidden()
    await expect(impact).toBeFocused()
    if (viewport.width >= 1000) {
      expect((await speed.boundingBox())!.height).toBeLessThanOrEqual(90)
      expect((await metrics.boundingBox())!.height).toBeLessThanOrEqual(64)
    }

    const metricDisclosure = metrics.locator('button[aria-haspopup="dialog"]')
    await expect(metricDisclosure).toHaveAccessibleName('How these counts are calculated')
    await expect(metricDisclosure).toHaveAttribute('aria-expanded', 'false')
    expect((await metricDisclosure.boundingBox())!.height).toBeGreaterThanOrEqual(24)
    await metricDisclosure.focus()
    await metricDisclosure.press('Enter')
    await expect(metricDisclosure).toHaveAttribute('aria-expanded', 'true')
    const metricDialog = page.getByRole('dialog', { name: 'Information: Dashboard metrics' })
    await expect(metricDialog).toBeVisible()
    await expectWithinMain(page, metricDialog)
    await page.keyboard.press('Escape')
    await expect(metricDisclosure).toHaveAttribute('aria-expanded', 'false')
    await expect(metricDisclosure).toBeFocused()

    await page.goto('/logs')
    const sources = page.getByRole('group', { name: 'Information: General event sources' })
    const ipv6 = page.getByRole('group', { name: 'Warning: IPv6 router advertisements' })
    for (const notice of [sources, ipv6]) {
      await expect(notice).toHaveAttribute('data-compact', 'true')
      await expectWithinMain(page, notice)
    }
    await expect(ipv6.getByText('Warning', { exact: true })).toBeVisible()
    await expect(ipv6.getByText(/IPv6-only.*does not indicate an IPv4 outage/)).toBeVisible()
    const sourceDisclosure = sources.getByRole('button', {
      name: 'More information about event sources',
    })
    await sourceDisclosure.focus()
    await sourceDisclosure.press('Enter')
    const sourceDialog = page.getByRole('dialog', { name: 'Information: General event sources' })
    await expect(sourceDialog).toBeVisible()
    await expectWithinMain(page, sourceDialog)
    await expect(sourceDialog).toContainText(/Packet-flow\/NFLOG/)
    await page.keyboard.press('Escape')
    await expect(sourceDialog).toBeHidden()
    await expect(sourceDisclosure).toBeFocused()
    await expect(ipv6.locator('details')).toHaveCount(1)
    await expect(ipv6.locator('.details-popover')).toHaveCount(0)
    if (viewport.width >= 1000) {
      expect((await sources.boundingBox())!.height).toBeLessThanOrEqual(64)
      expect((await ipv6.boundingBox())!.height).toBeLessThanOrEqual(72)
      const borders = await sources.evaluate((element) => {
        const style = getComputedStyle(element)
        return { perimeter: style.borderTopColor, rail: style.borderLeftColor }
      })
      expect(borders.perimeter).not.toBe(borders.rail)
    }

    await page.goto('/settings')
    const uplinks = page.getByRole('group', { name: 'Information: Wireless uplinks' })
    const neighbours = page.getByRole('group', { name: 'Information: 802.11k neighbour reports' })
    for (const notice of [uplinks, neighbours]) {
      await expect(notice).toHaveAttribute('data-compact', 'true')
      await expectWithinMain(page, notice)
    }
    const uplinkDisclosure = uplinks.getByRole('button', {
      name: 'More information about wireless uplinks',
    })
    await uplinkDisclosure.focus()
    await uplinkDisclosure.press('Enter')
    const uplinkDialog = page.getByRole('dialog', { name: 'Information: Wireless uplinks' })
    await expect(uplinkDialog).toBeVisible()
    await expectWithinMain(page, uplinkDialog)
    await page.keyboard.press('Escape')
    await expect(uplinkDisclosure).toBeFocused()

    const overflow = await readOverflow(page)
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.main).toBeLessThanOrEqual(1)
    expect(unexpectedRequests).toEqual([])
  })
}

test('Topology keeps review actions visible while technical detail is collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const partialTopology = {
    ...topology,
    complete: false,
    gaps: ['device:1/ip-4-neigh: source call failure: access/permission denied'],
  }
  const unexpectedRequests = await installControllerFixture(page, partialTopology)
  await page.goto('/topology')

  await expect(page.getByRole('heading', { level: 1, name: 'Topology' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible()
  const notice = page.getByRole('group', { name: 'Information: Bridge and neighbor sources' })
  const disclosure = notice.locator('summary')
  const detail = notice.getByText(/Optional controller access may restore bridge and neighbor evidence/)
  const action = notice.getByRole('button', { name: 'Review optional capability' })
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await expect(detail).toBeHidden()
  await expect(action).toBeVisible()
  expect(await action.evaluate((element) => element.closest('.notice-disclosure') == null)).toBe(true)
  await action.focus()
  await expect(action).toBeFocused()
  await disclosure.focus()
  await disclosure.press('Enter')
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(detail).toBeVisible()
  const overflow = await readOverflow(page)
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.main).toBeLessThanOrEqual(1)
  expect(unexpectedRequests).toEqual([])
})

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  test(`${viewport.width}x${viewport.height} list page headers keep controls in view`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const unexpectedRequests = await installControllerFixture(page)
    await page.goto('/devices')
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible()

    await expect(page.getByRole('heading', { level: 1, name: 'Devices' })).toHaveCount(1)
    await expect(page.locator('#main-content').getByRole('button', { name: 'Adopt a device' })).toBeVisible()
    let overflow = await readOverflow(page)
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.main).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Client Devices' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Client Devices' })).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Client filters' })).toBeVisible()
    overflow = await readOverflow(page)
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.main).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Logs' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Logs' })).toHaveCount(1)
    const eventView = page.getByRole('group', { name: 'Event view' })
    await expect(eventView).toBeVisible()
    await expect(eventView.getByRole('button', { name: 'General' })).toHaveAttribute('aria-pressed', 'true')
    overflow = await readOverflow(page)
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.main).toBeLessThanOrEqual(1)
    expect(unexpectedRequests).toEqual([])
  })
}

test('390x844 responsive routes keep controls and state in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const unexpectedRequests = await installControllerFixture(page)

  await page.goto('/logs')
  await expect(page.getByRole('heading', { level: 1, name: 'Logs' })).toBeVisible()
  expect(await page.locator('.logs-page').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  await expectWithinMain(page, page.getByRole('group', { name: 'Event view' }))
  await expectWithinMain(page, page.locator('.logs-page .pager').getByRole('button', { name: 'Next' }))

  await page.goto('/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
  await page.getByRole('tab', { name: 'Accounts' }).click()
  for (const field of ['Username', 'Password', 'Repeat password']) {
    await expectWithinMain(page, page.getByLabel(field, { exact: true }).first())
  }
  await expectWithinMain(page, page.getByRole('combobox', { name: /^Role/ }))

  await page.goto('/radios')
  await expect(page.getByRole('heading', { level: 1, name: 'Radios & Channel Plan' })).toBeVisible()
  expect(await page.locator('.radio-stat-grid').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  expect(await page.locator('.radio-plan-row').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  await expectWithinMain(page, page.getByLabel('Filter by access point'))
  await expectWithinMain(page, page.getByLabel('Filter by band'))
  await expectWithinMain(page, page.getByLabel('Channel Plan legend'))

  await page.goto('/topology')
  await expect(page.getByRole('heading', { level: 1, name: 'Topology' })).toBeVisible()
  expect(await page.locator('.topology-stat-grid').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  await expectWithinMain(page, page.getByText('Evidence coverage').locator('..'))
  await expectWithinMain(page, page.getByLabel('Topology confidence legend'))

  await page.goto('/policy')
  const policyTabs = page.getByRole('tablist', { name: 'Policy Engine views' })
  await expect(policyTabs).toBeVisible()
  await expectWithinMain(page, policyTabs)
  await page.getByRole('tab', { name: 'Objects' }).click()
  expect(await page.locator('.policy-object-picker').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  await page.getByRole('checkbox', { name: /^Route\b/ }).check()
  expect(await page.locator('.policy-route-fields').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)

  await page.goto('/clients')
  await expect(page.getByRole('heading', { level: 1, name: 'Client Devices' })).toBeVisible()
  await expectWithinMain(page, page.locator('.pager').getByRole('button', { name: 'Next' }))

  const overflow = await readOverflow(page)
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.main).toBeLessThanOrEqual(1)
  expect(unexpectedRequests).toEqual([])
})

test('320px narrow dashboard, Logs pager, and Channel Plan do not clip', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const unexpectedRequests = await installControllerFixture(page)

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  const health = page.getByRole('region', { name: 'Internet health details' })
  await expect(health.getByRole('img')).toHaveCount(4)
  await expectWithinMain(page, health)
  const healthView = health.getByRole('group', { name: 'Internet health history view' })
  await healthView.getByRole('button', { name: 'Table' }).click()
  await expectWithinMain(page, health.getByRole('region', { name: 'Internet health history table' }))
  await healthView.getByRole('button', { name: 'Chart' }).click()
  const speedChart = page.getByLabel(/Throughput history for 3 completed tests/)
  await expect(speedChart).toBeVisible()
  await expectWithinMain(page, speedChart)
  const downloadBar = page.getByRole('meter', { name: 'Download throughput' }).first()
  await downloadBar.focus()
  await expect(page.getByRole('tooltip').filter({ hasText: 'Download 125.3 Mbps' })).toBeVisible()
  const [trackBox, scaleBox] = await Promise.all([
    downloadBar.boundingBox(),
    page.locator('.speedtest-chart-scale').boundingBox(),
  ])
  expect(Math.abs(trackBox!.x - scaleBox!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(trackBox!.x + trackBox!.width - scaleBox!.x - scaleBox!.width)).toBeLessThanOrEqual(1)
  const lastUpload = page.getByRole('meter', { name: 'Upload throughput' }).last()
  await lastUpload.focus()
  const lastTooltip = page.getByRole('tooltip').filter({ hasText: 'Upload 105.5 Mbps' })
  await expect(lastTooltip).toBeVisible()
  await expectWithinMain(page, lastTooltip)
  const speedView = page.getByRole('group', { name: 'Speed test history view' })
  await speedView.getByRole('button', { name: 'Table' }).click()
  await expectWithinMain(page, page.getByRole('region', { name: 'Speed test result table' }))
  await speedView.getByRole('button', { name: 'Chart' }).click()
  let overflow = await readOverflow(page)
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.main).toBeLessThanOrEqual(1)

  await page.goto('/logs')
  const logsPager = page.locator('.logs-page .pager')
  await expect(logsPager).toBeVisible()
  await expectWithinMain(page, logsPager.getByRole('button', { name: 'Previous' }))
  await expectWithinMain(page, logsPager.getByRole('button', { name: 'Next' }))

  await page.goto('/radios')
  const channel = page.locator('.radio-channel[data-state="in-use"]')
  await expect(channel).toBeVisible()
  await expectWithinMain(page, channel)
  expect(await page.locator('.radio-plan-row').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(1)
  overflow = await readOverflow(page)
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.main).toBeLessThanOrEqual(1)
  expect(unexpectedRequests).toEqual([])
})

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} selected controls and channel numerals meet text contrast`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const unexpectedRequests = await installControllerFixture(page)

    await page.goto('/logs')
    if (theme === 'light') await page.getByRole('button', { name: /switch to light theme/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    expect(await contrastRatio(page.getByRole('button', { name: 'General' }))).toBeGreaterThanOrEqual(4.5)

    await page.goto('/policy')
    const objects = page.getByRole('tab', { name: 'Objects' })
    await objects.click()
    expect(await contrastRatio(objects)).toBeGreaterThanOrEqual(4.5)

    await page.goto('/radios')
    await expect(page.locator('.radio-channel')).toHaveCount(4)
    for (const state of ['in-use', 'enabled', 'restricted', 'unknown']) {
      expect(await contrastRatio(page.locator(`.radio-channel[data-state="${state}"]`))).toBeGreaterThanOrEqual(4.5)
    }

    await page.goto('/')
    const health = page.getByRole('region', { name: 'Internet health details' })
    await expect(health.getByRole('img')).toHaveCount(4)
    await expectWithinMain(page, health)
    const overflow = await readOverflow(page)
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.main).toBeLessThanOrEqual(1)
    expect(unexpectedRequests).toEqual([])
  })
}
