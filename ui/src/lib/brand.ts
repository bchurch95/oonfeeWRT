export function getAppTitle(): string {
  try {
    const local = window.localStorage.getItem('oonfeewrt:custom_app_title')
    if (local && local.trim()) {
      return local.trim()
    }
  } catch {}
  const envObj = (import.meta as unknown as { env?: Record<string, string> })?.env
  const envTitle = envObj?.VITE_APP_TITLE
  if (envTitle && typeof envTitle === 'string' && envTitle.trim()) {
    return envTitle.trim()
  }
  return 'oonfeeWRT'
}

export function setAppTitle(title: string): void {
  try {
    if (!title || !title.trim() || title.trim() === 'oonfeeWRT') {
      window.localStorage.removeItem('oonfeewrt:custom_app_title')
    } else {
      window.localStorage.setItem('oonfeewrt:custom_app_title', title.trim())
    }
  } catch {}
}
