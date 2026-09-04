// Visual regression capture for the modernization branch.
//
// Not an assertion suite — it renders every screen against the shared fixtures
// and writes full-page screenshots to .visual/ so the design can be iterated
// against. Screenshots land on disk, so they are ignored by git.
import { test } from '@playwright/test'
import {
  accounts,
  clientPage,
  dashboard,
  devicesFixture,
  radios,
  session,
  site,
  speedTests,
  topology,
} from './fixtures'

const SCREENS = [
  '/',
  '/topology',
  '/devices',
  '/clients',
  '/radios',
  '/policy',
  '/settings',
  '/adopt',
  '/logs',
  '/firmware',
]

async function installVisualMocks(page: import('@playwright/test').Page) {
  const responses: Record<string, unknown> = {
    '/api/v1/setup': { needs_setup: false },
    '/api/v1/session': session,
    '/api/v1/account': { account: { id: 1, username: 'operator', role: 'owner', role_label: 'Owner', enabled: true } },
    '/api/v1/account/sessions': { sessions: [] },
    '/api/v1/accounts': accounts,
    '/api/v1/dashboard': dashboard,
    '/api/v1/devices': devicesFixture,
    '/api/v1/clients': clientPage,
    '/api/v1/topology': topology,
    '/api/v1/site': site,
    '/api/v1/radios': radios,
    '/api/v1/speedtests': speedTests,
    '/api/v1/events': { events: [], total: 0, limit: 100, offset: 0, truncated: false },
    '/api/v1/site/policies': { objects: [], version: 1 },
    '/api/v1/site/mesh-health': { complete: true, expected_devices: 0, observed_devices: 0, gaps: [] },
    '/api/v1/discovery': { scan_plan: [] },
    '/api/v1/diagnostics': { available: true, active: null, history: [] },
    '/api/v1/backups': { available: true, jobs: [] },
    '/api/v1/restores': { available: false },
  }
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const exact = responses[path]
    if (exact !== undefined) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(exact) })
      return
    }
    // Series and per-device detail endpoints render as empty evidence.
    if (path.startsWith('/api/v1/series') || path.startsWith('/api/v1/devices/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ device_id: 1, kind: '', key: '', res: '5m', points: [] }) })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) })
  })
  // Neutralise the live channel so no websocket fixture is needed.
  await page.addInitScript(() => {
    class NoopSocket {
      readyState = 0
      onopen: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onclose: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      constructor() {
        queueMicrotask(() => {
          this.readyState = 1
          this.onopen?.(new Event('open'))
        })
      }
      send() {}
      close() {
        this.readyState = 3
        this.onclose?.(new Event('close'))
      }
    }
    Object.defineProperty(window, 'WebSocket', { value: NoopSocket })
  })
}

test('capture all screens', async ({ page }) => {
  await installVisualMocks(page)
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const path of SCREENS) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    // Let lazy renders and charts settle before the shutter.
    await page.waitForTimeout(400)
    const name = path === '/' ? 'dashboard' : path.slice(1)
    await page.screenshot({ path: `.visual/${name}.png`, fullPage: true })
  }

  // Light theme pass on the two busiest screens.
  for (const [path, name] of [['/', 'dashboard'], ['/devices', 'devices']] as const) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /switch to light theme/i }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `.visual/${name}-light.png`, fullPage: true })
  }
})
