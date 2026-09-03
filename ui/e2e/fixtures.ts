// Shared API fixtures for browser tests. Every response the UI can see in a
// browser test comes from here, so the presentation layer is tested against
// exactly this evidence — no controller, no network.

export const dashboardObservedAt = Date.now() - 240_000
export const dashboardTimes = Array.from(
  { length: 72 },
  (_, index) => dashboardObservedAt - (71 - index) * 300_000,
)

export function wanMetric(
  kind: string,
  unit: string,
  value: number | null,
  samples: Array<number | null>,
  status: 'fresh' | 'last_observed' | 'unavailable' = 'fresh',
) {
  return {
    kind,
    unit,
    meaning: `${kind} from the selected default-route interface`,
    status,
    value,
    as_of: value == null ? null : dashboardObservedAt,
    points: samples.map((sample, index) => ({ ts: dashboardTimes[index], value: sample })),
  }
}

export const dashboard = {
  devices: { total: 2, online: 2, offline: 0, pending: 0, unknown: 0 },
  wireless_clients: 1,
  wireless_clients_complete: true,
  known_devices: 3,
  active_devices: 3,
  upstream_devices: 0,
  unscoped_devices: 0,
  gateway_uplinks: [{ device_id: 1, name: 'Gateway', state: 'up' }],
  focused_devices: 0,
  quiesced_devices: 0,
  series_count: 24,
  recent_events: [],
  recent_alert_events: [{
    ID: 4,
    TS: 1_788_000_000,
    Severity: 'warning',
    Event: 'fixture.warning',
  }],
  wan: {
    target: '1.1.1.1',
    probe: 'icmp',
    freshness: 'fresh',
    as_of: dashboardObservedAt,
    gateway: { device_id: 1, name: 'Gateway', route_interface: 'wan', series_key: 'wan' },
    resolution: '5m',
    bucket_ms: 300_000,
    from: dashboardTimes[0],
    to: dashboardTimes.at(-1),
    metrics: {
      download_bps: wanMetric('site_wan_download_bps', 'B/s', 13_125,
        dashboardTimes.map((_, index) => index % 17 === 0
          ? null
          : index % 23 === 0 ? 0 : 12_000 + (index % 9) * 450)),
      upload_bps: wanMetric('site_wan_upload_bps', 'B/s', 66.75,
        dashboardTimes.map((_, index) => index % 19 === 7
          ? null
          : index % 29 === 0 ? 0 : 62 + (index % 8) * 1.25)),
      latency_ms: wanMetric('site_wan_latency_ms', 'ms', 22,
        dashboardTimes.map((_, index) => index % 31 === 4 ? null : 21 + (index % 8) * .2)),
      loss_pct: wanMetric('site_wan_loss_pct', 'percent', 0,
        dashboardTimes.map((_, index) => index % 31 === 5 ? null : index === 20 ? 1.2 : 0)),
      reachable: wanMetric('site_wan_reachable', 'boolean', 1, []),
    },
  },
}

export const topology = {
  at: 1_788_000_000_000,
  complete: true,
  truncated: false,
  gaps: [],
  nodes: [
    { id: 'synthetic:internet', kind: 'synthetic', name: 'Internet', synthetic: true },
    { id: 'device:1', kind: 'device', name: 'Gateway', device_id: 1, synthetic: false },
    { id: 'device:2', kind: 'device', name: 'Access point', device_id: 2, synthetic: false },
    { id: 'client:1', kind: 'client', name: 'Client', synthetic: false },
  ],
  edges: [{
    id: 1,
    child_id: 'device:2',
    parent_id: 'device:1',
    parent_port: 'lan2',
    medium: 'wired',
    confidence: 'measured',
    valid_from: 1_788_000_000_000,
    last_seen: 1_788_000_000_000,
    evidence: [],
    ambiguities: [],
  }],
  last_known_edges: [],
}

export const speedTests = {
  jobs: [
    {
      id: '11111111111111111111111111111111', plan_id: `sha256:${'a'.repeat(64)}`,
      state: 'completed', phase: 'complete', progress_percent: 100,
      provider: 'Cloudflare', method: 'single stream', provenance: 'controller-host', endpoint: 'speed.cloudflare.com',
      estimated_bytes: 15_000_000, created_at: Date.now() - 86_430_000, finished_at: Date.now() - 86_400_000,
      download_mbps: 125.3, upload_mbps: 107.4, idle_latency_ms: 18.2, idle_jitter_ms: 2.4,
      loaded_latency_ms: null, loaded_jitter_ms: null, bytes_downloaded: 12_000_000, bytes_uploaded: 3_000_000,
    },
    {
      id: '22222222222222222222222222222222', plan_id: `sha256:${'a'.repeat(64)}`,
      state: 'completed', phase: 'complete', progress_percent: 100,
      provider: 'Cloudflare', method: 'single stream', provenance: 'controller-host', endpoint: 'speed.cloudflare.com',
      estimated_bytes: 15_000_000, created_at: Date.now() - 172_830_000, finished_at: Date.now() - 172_800_000,
      download_mbps: 216.3, upload_mbps: 412.4, idle_latency_ms: 12.1, idle_jitter_ms: 1.8,
      loaded_latency_ms: null, loaded_jitter_ms: null, bytes_downloaded: 12_000_000, bytes_uploaded: 3_000_000,
    },
    {
      id: '33333333333333333333333333333333', plan_id: `sha256:${'a'.repeat(64)}`,
      state: 'completed', phase: 'complete', progress_percent: 100,
      provider: 'Cloudflare', method: 'single stream', provenance: 'controller-host', endpoint: 'speed.cloudflare.com',
      estimated_bytes: 15_000_000, created_at: Date.now() - 259_230_000, finished_at: Date.now() - 259_200_000,
      download_mbps: 117.8, upload_mbps: 105.5, idle_latency_ms: 15.4, idle_jitter_ms: 2.1,
      loaded_latency_ms: null, loaded_jitter_ms: null, bytes_downloaded: 12_000_000, bytes_uploaded: 3_000_000,
    },
  ],
  active: null,
  test: {
    plan_id: `sha256:${'a'.repeat(64)}`,
    provider: 'Cloudflare',
    method: 'controller-host HTTPS transfer',
    provenance: 'controller-host',
    endpoint: 'speed.cloudflare.com',
    download_endpoint: 'https://speed.cloudflare.com/__down',
    upload_endpoint: 'https://speed.cloudflare.com/__up',
    estimated_bytes: 15_000_000,
    max_duration_seconds: 30,
  },
  limits: { max_history: 3 },
  disclosure: {
    vantage_point: 'controller-host',
    router_management_calls: false,
    router_changes: false,
    saturation_warning: 'The test may saturate the WAN while it runs.',
    privacy: 'The provider observes the controller public address and transfer metadata.',
  },
}

export const clientPage = {
  clients: [{
    mac: '02:00:00:00:00:01',
    name: 'Fixture phone',
    ipv4: '192.168.1.20',
    first_seen: 1_787_999_000,
    last_seen: 1_788_000_000,
    blocked: false,
    connection: 'wireless',
    online: true,
    signal: -55,
    device_id: 1,
    scope: 'local',
  }],
  total: 1,
  limit: 500,
  offset: 0,
  facets: {
    presence: [{ value: 'online', count: 1 }],
    connection: [{ value: 'wireless', count: 1 }],
    scope: [{ value: 'local', count: 1 }],
  },
  note: 'Current fixture evidence is available',
  scope_note: '',
}

export const site = {
  name: 'Fixture site',
  uuid: 'f8a258d7-3bf1-4099-a534-ce1f0a6cdd7c',
  wlans: [],
  meshes: [],
  uplinks: [],
  groups: [],
  networks: [{ id: 1, name: 'lan', vlan: 1, cidr: '192.168.1.1/24', zone: 'lan', enabled: true }],
  zones: [{ name: 'lan', forward_to: ['wan'], explicit: true }],
  policies: [],
  policy_capabilities: [
    { kind: 'firewall', available: true },
    { kind: 'route', available: true },
    { kind: 'fixed_ip', available: true },
  ],
  problems: [],
  overrides: [],
  overridable: [],
  override_note: '',
}

export const radios = {
  generated_at: 1_788_000_000_000,
  gaps: [],
  devices: [{
    device_id: 7,
    name: 'Fixture AP',
    status: { last_poll_ok: true, consecutive_failures: 0, stale: false },
    radios: [{
      radio_key: 'radio0',
      up: true,
      band: '5g',
      configured_channel: 'auto',
      htmode: 'VHT80',
      current_mhz: 5180,
      current_channel: 36,
      inventory_observed_at: 1_788_000_000_000,
      channels_observed_at: 1_788_000_000_000,
      stale: false,
      interfaces: [{ name: 'phy0-ap0', mode: 'ap' }],
      channels_known: true,
      channels: [
        { band: '5g', channel: 36, mhz: 5180, state: 'in-use', availability: 'enabled', in_use: true, restricted: false, dfs: null, excluded: null, flags: [] },
        { band: '5g', channel: 44, mhz: 5220, state: 'enabled', availability: 'enabled', in_use: false, restricted: false, dfs: null, excluded: null, flags: [] },
        { band: '5g', channel: 52, mhz: 5260, state: 'restricted', availability: 'restricted', in_use: false, restricted: true, dfs: null, excluded: null, flags: ['NO-IR'] },
        { band: '5g', channel: 60, mhz: 5300, state: 'unknown', availability: 'unknown', in_use: false, restricted: false, dfs: null, excluded: null, flags: [] },
      ],
      scan_capability: 'absent',
      latest_observations: [],
    }],
  }],
}

export const accounts = {
  accounts: [{
    id: 1,
    username: 'operator',
    role: 'owner',
    role_label: 'Owner',
    enabled: true,
    created_at: 1_787_000_000,
    last_login_at: 1_788_000_000,
    active_session_count: 1,
  }],
  roles: [
    { value: 'owner', label: 'Owner', description: 'Full controller and account administration.' },
    { value: 'admin', label: 'Administrator', description: 'Full network administration.' },
    { value: 'operator', label: 'Operator', description: 'Operate the network.' },
    { value: 'viewer', label: 'Read only', description: 'View controller state.' },
  ],
}

export const session = {
  admin_id: 1,
  username: 'operator',
  role: 'owner',
  role_label: 'Owner',
  csrf: 'fixture',
  reauthenticated_until: null,
}

export const devicesFixture = {
  devices: [
    {
      id: 1,
      mac: '02:00:00:00:00:11',
      name: 'Gateway',
      host: '192.168.1.1',
      role: 'gateway',
      functions: ['gateway', 'ap', 'switch'],
      adopted: true,
      adopted_at: 1_780_000_000,
      class: 'x86/64',
      firmware: '23.05.4',
      last_seen: 1_788_000_000,
      poll_state: 'ok',
      status: 'online',
      tier: 'baseline',
    },
    {
      id: 2,
      mac: '02:00:00:00:00:22',
      name: 'Access point',
      host: '192.168.1.5',
      role: 'access_point',
      functions: ['ap', 'switch'],
      adopted: true,
      adopted_at: 1_781_000_000,
      class: 'armvirt',
      firmware: '23.05.4',
      last_seen: 1_788_000_000,
      poll_state: 'ok',
      status: 'online',
      tier: 'focused',
    },
    {
      id: 3,
      mac: '02:00:00:00:00:33',
      name: 'Edge router',
      host: '10.0.0.1',
      role: 'upstream',
      functions: ['gateway'],
      adopted: false,
      adopted_at: null,
      class: null,
      firmware: '',
      last_seen: null,
      poll_state: 'never',
      status: 'unknown',
      tier: 'baseline',
    },
  ],
}
