import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { moveColumn, orderColumns, parsePrefs } from '../lib/columns'
import type { ColumnPrefs } from '../lib/columns'

export type { ColumnPrefs }
export { orderColumns, moveColumn }

/** Status pill. The dot is never the only signal — UI-SPEC §3 calls colour-only
 *  status a genuine accessibility flaw and says not to inherit it, so the text
 *  always ships alongside. */
export function Status({ value }: { value: string }) {
  const tone =
    value === 'measured' ? 'accent' :
    value === 'online' || value === 'wireless' ? 'good' :
    value === 'offline' || value === 'blocked' ? 'critical' :
    value === 'pending' || value === 'ambiguous' ? 'warning' : 'muted'
  const colors = {
    accent: 'bg-theme-accent',
    good: 'bg-theme-good',
    critical: 'bg-theme-critical',
    warning: 'bg-theme-warning',
    muted: 'text-theme-muted bg-transparent',
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={`w-1.75 h-1.75 rounded-full ${colors[tone] === 'text-theme-muted bg-transparent' ? 'border border-current' : colors[tone]}`}
      />
      <span className="text-sm text-theme-text-secondary">{value}</span>
    </span>
  )
}

export function PageHeader({
  title,
  purpose,
  actions,
}: {
  title: string
  purpose: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-theme-text-primary mb-1">{title}</h1>
        <p className="text-sm text-theme-text-secondary">{purpose}</p>
      </div>
      {actions != null && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Card({
  title,
  actions,
  children,
  pad = true,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  pad?: boolean
}) {
  return (
    <section className="ui-card bg-theme-surface-1 border border-theme-border rounded-xl overflow-hidden shadow-card">
      {title && (
        <header className="ui-card-header px-6 py-4 border-b border-theme-border flex justify-between items-center">
          <span className="flex-1 min-w-0 overflow-wrap-anywhere text-theme-text-primary font-medium">{title}</span>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`ui-card-body ${pad ? 'p-6' : ''}`} data-padded={pad}>{children}</div>
    </section>
  )
}

/** A hero number with its label. tabular-nums so a changing value does not
 *  make the layout jitter. */
export function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string
  value: ReactNode
  tone?: 'good' | 'warning' | 'critical' | 'muted'
  /** A small line under the number, for what the number deliberately leaves
   *  out. A count that excludes something should say what, next to itself —
   *  an explanation two cards away does not get read. */
  sub?: ReactNode
}) {
  const colors = {
    good: 'text-theme-good',
    warning: 'text-theme-warning',
    critical: 'text-theme-critical',
    muted: 'text-theme-muted',
  }
  const colorClass = tone ? colors[tone] : 'text-theme-text-primary'
  return (
    <div className="ui-stat">
      <div className="ui-stat-label text-xs text-theme-text-secondary mb-1 font-medium">{label}</div>
      <div
        className={`ui-stat-value num text-lg font-semibold ${colorClass}`}
      >
        {value}
      </div>
      {sub != null && (
        <div className="ui-stat-note text-xs text-theme-text-muted mt-1">
          {sub}
        </div>
      )}
    </div>
  )
}

export function Button({
  children,
  onClick,
  kind = 'default',
  disabled,
  type = 'button',
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed,
}: {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  kind?: 'default' | 'primary'
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-pressed'?: boolean
}) {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-accent disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
  const kindClasses = kind === 'primary' 
    ? "bg-theme-accent hover:bg-theme-accent-hover text-white shadow-sm hover:shadow-md" 
    : "bg-theme-surface-2 hover:bg-theme-surface-3 text-theme-text-primary border border-theme-border hover:border-theme-border-strong"
  return (
    <button
      className={`${baseClasses} ${kindClasses}`}
      data-kind={kind}
      type={type}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  )
}

// React 19 passes `ref` through as an ordinary prop on function components, so
// the spread below forwards it without forwardRef. The type has to say so.
export function Field({
  label,
  style,
  ...props
}: { label: string } & React.ComponentPropsWithRef<'input'>) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      <input
        {...props}
        className="w-full px-4 py-2.5 rounded-lg bg-theme-surface-0 border border-theme-border-strong text-theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent transition-all"
      />
    </label>
  )
}

export function TextAreaField({
  label,
  ...props
}: { label: string } & React.ComponentPropsWithRef<'textarea'>) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      <textarea
        rows={5}
        {...props}
        className="w-full px-4 py-2.5 rounded-lg resize-vertical bg-theme-surface-0 border border-theme-border-strong text-theme-text-primary font-mono text-xs focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent transition-all"
      />
    </label>
  )
}

/** Shown wherever a value is genuinely unknown, so an empty cell can never be
 *  mistaken for a zero. The reason is exposed to assistive technology and by a
 *  focus/click tooltip; `title` alone would be unreachable on touch and
 *  unreliable from the keyboard. */
export function Unknown({ why }: { why: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="unknown-value">
      <button
        type="button"
        className="unknown-value-trigger px-2 py-1 rounded bg-theme-surface-2 hover:bg-theme-surface-3 border border-theme-border text-theme-text-primary font-medium text-sm transition-colors"
        title={why}
        aria-label={`Unknown: ${why}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            event.currentTarget.blur()
          }
        }}
      >
        —
      </button>
      {open && (
        <span className="unknown-value-tooltip absolute z-50 px-3 py-2 bg-theme-surface-1 border border-theme-border rounded shadow-lg text-sm text-theme-text-primary" role="tooltip">
          {why}
        </span>
      )}
    </span>
  )
}

export type NoticeTone = 'warning' | 'critical' | 'accent'

/** Nonmodal details that stay out of the document flow. A mouse-opened panel
 *  dismisses when the pointer leaves; keyboard and touch activation persist
 *  until an explicit close, Escape, or an outside press. */
export function DetailsPopover({
  triggerLabel,
  openTriggerLabel = triggerLabel,
  triggerAriaLabel = triggerLabel,
  openTriggerAriaLabel = openTriggerLabel,
  title,
  children,
  className = '',
  panelClassName = '',
}: {
  triggerLabel: string
  openTriggerLabel?: string
  triggerAriaLabel?: string
  openTriggerAriaLabel?: string
  title: string
  children: ReactNode
  className?: string
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const regionRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openMode = useRef<'mouse' | 'persistent' | null>(null)
  const pointerType = useRef('')
  const focusPanelOnOpen = useRef(false)
  const panelID = useId()
  const titleID = useId()
  const supportsPopover = typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function'

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    openMode.current = null
    pointerType.current = ''
    focusPanelOnOpen.current = false
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  useEffect(() => {
    try {
      if (open) panelRef.current?.showPopover?.()
      else panelRef.current?.hidePopover?.()
    } catch {
      // `hidden` remains the fallback where the Popover API is unavailable.
    }
    if (open && focusPanelOnOpen.current) {
      focusPanelOnOpen.current = false
      window.requestAnimationFrame(() => closeRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!regionRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  return (
    <div
      ref={regionRef}
      className={`details-popover ${className}`.trim()}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && openMode.current === 'mouse') close()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="details-popover-trigger px-3 py-1.5 rounded-lg bg-theme-surface-2 hover:bg-theme-surface-3 border border-theme-border text-theme-text-primary text-sm font-medium transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelID}
        aria-label={open ? openTriggerAriaLabel : triggerAriaLabel}
        onPointerDown={(event) => { pointerType.current = event.pointerType }}
        onClick={(event) => {
          if (open) {
            close()
            return
          }
          const keyboard = event.detail === 0
          const persistent = keyboard || pointerType.current !== 'mouse'
          openMode.current = persistent ? 'persistent' : 'mouse'
          focusPanelOnOpen.current = keyboard
          pointerType.current = ''
          setOpen(true)
        }}
      >
        {open ? openTriggerLabel : triggerLabel}
      </button>
      <div
        ref={panelRef}
        id={panelID}
        className={`details-popover-panel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleID}
        popover={supportsPopover ? 'manual' : undefined}
        hidden={!supportsPopover && !open}
        onFocusCapture={() => { openMode.current = 'persistent' }}
      >
        <div className="details-popover-heading border-b border-theme-border pb-3 mb-3">
          <strong id={titleID} className="text-theme-text-primary font-medium">{title}</strong>
          <button
            ref={closeRef}
            type="button"
            className="details-popover-close bg-transparent border-none text-theme-text-secondary cursor-pointer text-xl leading-4 hover:text-theme-text-primary transition-colors"
            aria-label={`Close ${title}`}
            onClick={() => close(true)}
          >
            ×
          </button>
        </div>
        <div className="details-popover-content text-theme-text-secondary">{children}</div>
      </div>
    </div>
  )
}

/** Authored progressive disclosure. Consequences, affected components, and
 *  actions stay visible. Supplemental information and explicitly opted-in
 *  warning guidance may use a nonmodal popover; critical and active plans stay
 *  inline. */
export function Notice({
  tone = 'warning',
  component,
  summary,
  details,
  defaultOpen = false,
  compact = false,
  actions,
  closedLabel = 'More information',
  openLabel = 'Hide information',
  popoverDetails = false,
}: {
  tone?: NoticeTone
  component: string
  summary: ReactNode
  details: ReactNode
  defaultOpen?: boolean
  /** Use for routine guidance and non-blocking conditions. Consent, retry,
   *  acknowledgement, active-operation and critical notices stay standard. */
  compact?: boolean
  actions?: ReactNode
  closedLabel?: string
  openLabel?: string
  /** Move supplemental detail into a nonmodal popover. The summary, severity,
   *  and actions remain visible. Critical notices and active plans stay inline. */
  popoverDetails?: boolean
}) {
  const [inlineOpen, setInlineOpen] = useState(defaultOpen)
  const detailsID = useId()
  const toneLabel = tone === 'accent' ? 'Information' : tone === 'critical' ? 'Critical' : 'Warning'
  const visibleToneLabel = compact && tone === 'accent' ? 'Info' : toneLabel
  const popover = popoverDetails && tone !== 'critical' && !defaultOpen &&
    !bannerHasAction(details)

  useEffect(() => {
    setInlineOpen(defaultOpen)
  }, [defaultOpen])

  const toneStyles = {
    accent: 'border-l-4 border-accent bg-accent/5 text-accent',
    warning: 'border-l-4 border-warning bg-warning/5 text-warning',
    critical: 'border-l-4 border-critical bg-critical/5 text-critical',
  }
  
  const colorStyle = toneStyles[tone] || toneStyles.accent

  return (
    <div
      className={`notice ${colorStyle} rounded-lg p-4 mb-4`}>
      <div className="notice-context mb-2 flex items-center gap-2">
        <span className="font-semibold">{visibleToneLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{component}</span>
      </div>
      <div className="notice-summary mb-2 font-medium">{summary}</div>
      {!popover ? (
        <details
          className="notice-disclosure"
          data-mode="inline"
          open={inlineOpen}
          onToggle={(event) => setInlineOpen(event.currentTarget.open)}
        >
          <summary aria-controls={detailsID} aria-expanded={inlineOpen} className="cursor-pointer text-theme-text-secondary font-medium">
            {inlineOpen ? openLabel : closedLabel}
          </summary>
          <div id={detailsID} className="notice-inline-details mt-2">{details}</div>
        </details>
      ) : (
        <DetailsPopover
          className="notice-disclosure"
          panelClassName="notice-details bg-theme-surface-1 rounded-lg p-4 border border-theme-border"
          triggerLabel={closedLabel}
          openTriggerLabel={openLabel}
          triggerAriaLabel={closedLabel === 'More information'
            ? `More information about ${component}` : closedLabel}
          openTriggerAriaLabel={openLabel === 'Hide information'
            ? `Hide information about ${component}` : openLabel}
          title={`${toneLabel}: ${component}`}
        >
          {details}
        </DetailsPopover>
      )}
      {actions != null && <div className="notice-actions mt-4">{actions}</div>}
    </div>
  )
}

/** Long passive banners collapse automatically. A prompt with any control stays
 *  open so acknowledgement or recovery actions are never hidden. Native
 *  details/summary preserves keyboard and expanded-state semantics. */
export function Banner({
  tone = 'warning',
  children,
}: {
  tone?: 'warning' | 'critical' | 'accent'
  children: ReactNode
}) {
  const colors = {
    accent: 'border-accent text-accent bg-accent/5',
    warning: 'border-warning text-warning bg-warning/5',
    critical: 'border-critical text-critical bg-critical/5',
  }
  const colorClass = colors[tone] || colors.accent
  const text = bannerText(children).replace(/\s+/g, ' ').trim()
  const collapsible = text.length > 260 && !bannerHasAction(children)
  return (
    <div
      className={`border-l-4 rounded-lg p-5 text-sm ${colorClass}`}
    >
      {collapsible ? (
        <details className="banner-details">
          <summary className="cursor-pointer text-theme-text-secondary overflow-wrap-anywhere font-medium">
            {truncateBannerText(text)}{' '}
            <span className="banner-details-show">Show details</span>
            <span className="banner-details-hide">Hide details</span>
          </summary>
          <div className="mt-4 overflow-wrap-anywhere">{children}</div>
        </details>
      ) : children}
    </div>
  )
}

const BANNER_ACTIONS = new Set(['a', 'button', 'details', 'input', 'select', 'summary', 'textarea'])

function bannerText(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      return String(child)
    }
    if (!isValidElement<{ children?: ReactNode }>(child)) return ''
    return bannerText(child.props.children)
  }).join('')
}

function bannerHasAction(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (!isValidElement<{ children?: ReactNode; onChange?: unknown; onClick?: unknown; role?: string }>(child)) {
      return false
    }
    const { children, onChange, onClick, role } = child.props
    return child.type === Button ||
      (typeof child.type === 'string' && BANNER_ACTIONS.has(child.type)) ||
      role === 'button' || onChange != null || onClick != null || bannerHasAction(children)
  })
}

function truncateBannerText(text: string): string {
  const clipped = text.slice(0, 160)
  const boundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, boundary > 80 ? boundary : 160).trimEnd()}…`
}

/** Column definition for DataGrid. */
export interface Column<T> {
  key: string
  header: string
  /** Right-aligns and applies tabular figures. */
  numeric?: boolean
  width?: number
  render: (row: T) => ReactNode
  /** Sort value; omit to make the column unsortable. */
  sortBy?: (row: T) => string | number
  /** Cannot be hidden. For the column that identifies the row — hiding it
   *  leaves a grid of attributes belonging to nothing. */
  required?: boolean
}

/**
 * Nominal row height in px, and the line-height that makes it come out exactly.
 *
 * Virtualization needs to know where row N starts without having measured rows
 * 0..N-1, so the height has to be a constant. `height: 33` on a `<td>` does not
 * produce one: in a table that is a *minimum*, and the row is as tall as its
 * content — measured 33.84px here, from 14px of padding plus whatever the
 * font's default line box came to. Over 1000 rows that 0.84px compounds to
 * 840px, so the window drifts most of a screen out of position by the bottom.
 *
 * Pinning the line box makes the arithmetic exact (19 + 7 + 7 = 33), and the
 * grid measures a real row anyway rather than trusting this — a font that
 * renders differently would otherwise reintroduce the same drift silently.
 */
export const ROW_HEIGHT = 33
const ROW_LINE_HEIGHT = 19

/** Rows drawn above and below the viewport, so a fast scroll does not show
 *  blank space before React catches up. */
const OVERSCAN = 8

/** Beyond this many rows, switch to windowed rendering. Below it, the DOM cost
 *  is irrelevant and a plain table keeps ctrl-F working over the whole grid. */
const VIRTUALIZE_ABOVE = 150

/**
 * Height of the grid's scroll viewport.
 *
 * The grid scrolls itself rather than letting the page scroll it, and that is
 * what makes the sticky header actually stick. `position: sticky` resolves
 * against the nearest scrolling ancestor, and Card sets `overflow: hidden` for
 * its rounded corners — which makes Card that ancestor. The header was
 * therefore pinned to the top of a box that does not scroll, so it slid away
 * with the rows and looked exactly like a header that was never sticky at all.
 * Invisible until a grid had enough rows to scroll, which is why 13 clients
 * never showed it.
 *
 * Viewport-relative so a tall window gets a tall grid, capped so an enormous
 * one does not put the pager off-screen.
 */
const VIEWPORT_HEIGHT = 'min(70vh, 760px)'

/**
 * The one grid, per UI-SPEC §5: sticky header, semantic alignment, click a row
 * to open its detail, show/hide columns, and virtualized rows.
 *
 * Virtualization kicks in above VIRTUALIZE_ABOVE rows rather than always. Below
 * that the DOM cost does not matter, and a plain table keeps the browser's own
 * find-in-page working across every row — which windowing silently breaks,
 * because the rows that are not rendered cannot be found. Trading that away at
 * 13 rows would be a bad deal; at 10,000 the grid is unusable without it.
 */
export function DataGrid<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty = 'Nothing to show',
  prefs,
  onPrefsChange,
  tableLabel,
  totalRows,
  rowOffset = 0,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
  /** Column visibility and order. Omit to disable column customization. */
  prefs?: ColumnPrefs
  onPrefsChange?: (v: ColumnPrefs) => void
  /** Accessible table name. Optional so existing screens keep their API. */
  tableLabel?: string
  /** Total data rows, excluding the one header row. */
  totalRows?: number
  /** Data rows preceding this page; used with totalRows for aria-rowindex. */
  rowOffset?: number
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const dragging = useRef<string | null>(null)
  // A finished drag must not also sort the column it landed on. Browsers differ
  // on whether a click follows a drag, so this is cheap insurance rather than a
  // fix for an observed bug — and getting it wrong means every reorder silently
  // re-sorts the grid.
  const swallowClick = useRef(false)
  const [scrollTop, setScrollTop] = useState(0)
  // Measured, not assumed: the CSS height is viewport-relative, and windowing
  // against a guessed height leaves blank rows on a tall screen.
  const [viewport, setViewport] = useState(600)
  // Also measured. See ROW_HEIGHT — a row that renders 0.84px taller than the
  // constant puts the window 840px out by row 1000.
  const [rowH, setRowH] = useState(ROW_HEIGHT)
  const scroller = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLTableSectionElement>(null)

  const hiddenSet = new Set(prefs?.hidden ?? [])
  const ordered = orderColumns(columns, prefs?.order ?? [])
  const shown = ordered.filter((c) => c.required || !hiddenSet.has(c.key))

  // Reordering always rewrites the FULL key list, hidden columns included, so
  // a column unhidden later comes back where the operator left it.
  const reorder = (from: string, to: string) => {
    if (!prefs || !onPrefsChange) return
    onPrefsChange({
      ...prefs,
      order: moveColumn(ordered.map((c) => c.key), from, to),
    })
  }

  let view = rows
  if (sort) {
    const col = columns.find((c) => c.key === sort.key)
    if (col?.sortBy) {
      view = [...rows].sort((a, b) => {
        const av = col.sortBy!(a)
        const bv = col.sortBy!(b)
        if (av === bv) return 0
        return (av < bv ? -1 : 1) * sort.dir
      })
    }
  }

  const virtual = view.length > VIRTUALIZE_ABOVE
  // Track the real viewport height so the window matches what is on screen
  // rather than a constant that happens to be wrong on a short window.
  useEffect(() => {
    if (!scroller.current) return
    const el = scroller.current
    const ro = new ResizeObserver(() => setViewport(el.clientHeight))
    ro.observe(el)
    setViewport(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // Measure a real row. One row is enough — they are uniform by construction —
  // and re-measuring on every render would fight with the window it feeds.
  useEffect(() => {
    const tr = body.current?.querySelector('tr[data-row]')
    if (!tr) return
    const h = tr.getBoundingClientRect().height
    if (h > 0 && Math.abs(h - rowH) > 0.5) setRowH(h)
  }, [rowH, columns.length, prefs?.hidden])

  // Keep React's idea of the scroll position tied to the DOM's.
  //
  // They diverged the moment virtualization engaged: the handler was only
  // attached while `virtual` was true, so scrolling a short grid updated
  // nothing, and growing it past the threshold rendered a window for
  // scrollTop 0 while the element sat at 1000px — a header above a completely
  // blank grid. The handler is now unconditional, and this re-reads the
  // element whenever the row set changes underneath it.
  useEffect(() => {
    const el = scroller.current
    if (el && el.scrollTop !== scrollTop) setScrollTop(el.scrollTop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.length, virtual])

  let first = 0
  let last = view.length
  if (virtual) {
    first = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN)
    last = Math.min(view.length, Math.ceil((scrollTop + viewport) / rowH) + OVERSCAN)
  }
  const slice = virtual ? view.slice(first, last) : view

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-theme-text-secondary">
        <p className="text-base">{empty}</p>
      </div>
    )
  }

  const header = (
    <thead>
      <tr aria-rowindex={totalRows == null ? undefined : 1}>
        {shown.map((c) => (
          <th
            key={c.key}
            scope="col"
            aria-sort={
              !c.sortBy
                ? undefined
                : sort?.key !== c.key
                  ? 'none'
                  : sort.dir === 1
                    ? 'ascending'
                    : 'descending'
            }
            draggable={!!onPrefsChange}
            onDragStart={(e) => {
              dragging.current = c.key
              e.dataTransfer.effectAllowed = 'move'
              // Firefox will not start a drag without payload.
              e.dataTransfer.setData('text/plain', c.key)
            }}
            onDragOver={(e) => {
              if (dragging.current && dragging.current !== c.key) e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragging.current
              dragging.current = null
              swallowClick.current = true
              if (from) reorder(from, c.key)
            }}
            onDragEnd={() => {
              dragging.current = null
            }}
            title={onPrefsChange ? 'Drag to reorder' : undefined}
            className={`sticky top-0 z-10 border-b border-theme-border p-3 font-semibold text-theme-text-secondary whitespace-nowrap cursor-${onPrefsChange ? 'grab' : 'default'} ${c.numeric ? 'text-right' : 'text-left'}`}
            style={{
              width: c.width,
              userSelect: 'none',
            }}
          >
            {c.sortBy ? (
              <button
                type="button"
                onClick={() => {
                  if (swallowClick.current) {
                    swallowClick.current = false
                    return
                  }
                  setSort((s) =>
                    s?.key === c.key
                      ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                      : { key: c.key, dir: 1 },
                  )
                }}
                className="inline-flex items-center gap-2 px-1 py-1 -ml-1 -mt-1 border-none bg-transparent text-inherit cursor-pointer font-inherit font-semibold text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                {c.header}
                {sort?.key === c.key && (
                  <span aria-hidden="true">{sort.dir === 1 ? ' ↑' : ' ↓'}</span>
                )}
              </button>
            ) : c.header}
          </th>
        ))}
      </tr>
    </thead>
  )

  const bodyEl = (
    <tbody ref={body}>
      {/* Spacers carry the height of the rows that are not rendered, so the
          scrollbar reflects the whole grid rather than the window. Without
          them the bar would jump as the window moved. */}
      {virtual && first > 0 && (
        <tr style={{ height: first * rowH }} aria-hidden>
          <td colSpan={shown.length} style={{ padding: 0, border: 'none' }} />
        </tr>
      )}
      {slice.map((row, index) => (
        <tr
          key={rowKey(row)}
          data-row
          tabIndex={onRowClick ? 0 : undefined}
          aria-rowindex={
            totalRows == null
              ? undefined
              : Math.max(0, rowOffset) + first + index + 2
          }
          onClick={(event) => {
            if (onRowClick && !isInteractiveDescendant(event.target, event.currentTarget)) {
              onRowClick(row)
            }
          }}
          onKeyDown={(event) => {
            if (
              onRowClick &&
              !isInteractiveDescendant(event.target, event.currentTarget) &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault()
              onRowClick(row)
            }
          }}
          className={`cursor-${onRowClick ? 'pointer' : 'default'} border-b border-theme-border hover:bg-theme-surface-2 transition-colors`}
        >
          {shown.map((c) => {
            const cell = c.render(row)
            return (
              <td
                key={c.key}
                className={`p-2.5 ${ROW_HEIGHT}px h-[${ROW_HEIGHT}px] ${c.numeric ? 'text-right' : 'text-left'} whitespace-nowrap overflow-hidden text-ellipsis`}
                title={typeof cell === 'string' ? cell : undefined}
                style={{
                  lineHeight: `${ROW_LINE_HEIGHT}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cell}
              </td>
            )
          })}
        </tr>
      ))}
      {virtual && last < view.length && (
        <tr aria-hidden>
          <td colSpan={shown.length} />
        </tr>
      )}
    </tbody>
  )

  const table = (
    <table
      aria-label={tableLabel}
      aria-rowcount={totalRows == null ? undefined : totalRows + 1}
      className="w-full border-collapse text-sm"
      style={{
        tableLayout: virtual ? 'fixed' : 'auto',
      }}
    >
      {header}
      {bodyEl}
    </table>
  )

  return (
    <div>
      {prefs !== undefined && onPrefsChange && (
        <ColumnPicker
          columns={ordered}
          hidden={hiddenSet}
          onChange={(keys) => onPrefsChange({ ...prefs, hidden: keys })}
          onMove={(key, delta) => {
            const keys = ordered.map((c) => c.key)
            const at = keys.indexOf(key)
            const to = keys[at + delta]
            if (to) reorder(key, to)
          }}
          virtualized={virtual}
          rowCount={view.length}
        />
      )}
      {/* Always its own scroll container, virtualized or not — see
          VIEWPORT_HEIGHT. A short grid never reaches the cap and so never
          shows an inner scrollbar. */}
      <div
        ref={scroller}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ overflow: 'auto', maxHeight: VIEWPORT_HEIGHT }}
      >
        {table}
      </div>
    </div>
  )
}

/** A row action must not steal a click or key intended for a control in one of
 *  its cells. This also covers controls whose visible text lives in a child
 *  span rather than directly on the button. */
function isInteractiveDescendant(target: EventTarget | null, row: HTMLElement): boolean {
  if (!(target instanceof Element) || target === row) return false
  return target.closest(
    'a[href], button, input, select, textarea, summary, [role="button"], ' +
    '[role="link"], [contenteditable="true"]',
  ) != null
}

/**
 * Show, hide and reorder columns.
 *
 * The arrows are not a lesser alternative to dragging the headers — they are
 * the only path that works without a mouse, and the only one that can move a
 * HIDDEN column, which dragging cannot because there is no header to grab.
 * Someone who hides a column, rearranges the rest, then unhides it would
 * otherwise have no way to say where it goes.
 *
 * It also states when the grid is windowed, because that changes what the page
 * can do: the browser's find-in-page only sees rendered rows, so a search that
 * comes up empty on a virtualized grid is not evidence the value is absent.
 * Leaving that unsaid would turn a rendering optimisation into a silently wrong
 * answer.
 */
function ColumnPicker<T>({
  columns,
  hidden,
  onChange,
  onMove,
  virtualized,
  rowCount,
}: {
  columns: Column<T>[]
  hidden: Set<string>
  onChange: (keys: string[]) => void
  onMove: (key: string, delta: -1 | 1) => void
  virtualized: boolean
  rowCount: number
}) {
  const [open, setOpen] = useState(false)
  const nHidden = columns.filter((c) => !c.required && hidden.has(c.key)).length

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b border-theme-border text-xs text-theme-text-muted"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="border border-theme-border-strong bg-theme-surface-2 text-theme-text-primary rounded-md px-4 py-1 text-xs font-medium cursor-pointer hover:bg-theme-surface-3 transition-colors"
      >
        Customize columns{nHidden > 0 ? ` (${nHidden} hidden)` : ''}
      </button>
      {virtualized && (
        <span title="Find-in-page only searches rendered rows." className="text-xs">
          {rowCount.toLocaleString()} rows, drawn as you scroll — ⌘F searches
          only what is on screen
        </span>
      )}
      {open && (
        <div
          className="flex flex-wrap gap-3 ml-1"
        >
          {columns.map((c, i) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-2"
            >
              <label
                className="inline-flex items-center gap-2 cursor-pointer text-theme-text-secondary"
                style={{
                  opacity: c.required ? 0.5 : 1,
                  pointerEvents: c.required ? 'none' : undefined,
                }}
                title={c.required ? 'This column identifies the row.' : undefined}
              >
                <input
                  type="checkbox"
                  checked={c.required || !hidden.has(c.key)}
                  onChange={() => {
                    const next = new Set(hidden)
                    if (next.has(c.key)) next.delete(c.key)
                    else next.add(c.key)
                    onChange([...next])
                  }}
                />
                {c.header}
              </label>
              <MoveButton
                label="◀"
                title={`Move ${textOf(c.header)} left`}
                disabled={i === 0}
                onClick={() => onMove(c.key, -1)}
              />
              <MoveButton
                label="▶"
                title={`Move ${textOf(c.header)} right`}
                disabled={i === columns.length - 1}
                onClick={() => onMove(c.key, 1)}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function MoveButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string
  title: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`border-none bg-transparent text-theme-text-secondary cursor-pointer text-xs leading-1 ${
        disabled ? 'text-theme-text-muted opacity-35 cursor-default' : ''
      }`}
      style={{
        padding: '0 2px',
      }}
    >
      {label}
    </button>
  )
}

/** The text of a column header, for a tooltip. Headers are usually strings;
 *  anything else gets a generic label rather than "[object Object]". */
function textOf(header: ReactNode): string {
  return typeof header === 'string' ? header : 'this column'
}

/**
 * Column visibility and order that survive a reload.
 *
 * localStorage, keyed by grid. UI-SPEC §5 says "persisted per user" and this is
 * per *browser* instead — the honest limitation is that choices do not follow
 * an operator to another machine. Doing it properly needs a preferences table
 * and an endpoint, which is not worth it while a controller has one operator;
 * when Phase 4 adds real multi-user accounts, this is the thing to move.
 */
export function useColumnPrefs(
  gridKey: string,
): [ColumnPrefs, (v: ColumnPrefs) => void] {
  const storageKey = `oonfee.columns.${gridKey}`
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => parsePrefs(read(storageKey)))
  const set = (v: ColumnPrefs) => {
    setPrefs(v)
    try {
      localStorage.setItem(storageKey, JSON.stringify(v))
    } catch {
      /* private mode, or a full quota: the grid still works for this session */
    }
  }
  return [prefs, set]
}

/**
 * Read one key, tolerating a localStorage that is not there.
 *
 * The guard is around the ACCESS, not just the parse. Reaching for
 * localStorage throws outright in some browsers — Safari's private mode
 * historically, and any profile with site data blocked — and this runs inside a
 * useState initialiser, so an exception does not degrade a preference: it
 * unmounts the screen. A grid that forgets which columns you hid is a small
 * annoyance; a blank page is not.
 */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Slide-over detail panel — 370px, enters from the right (UI-SPEC §1). */
export function SlideOver({
  title,
  onClose,
  children,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  const titleID = useId()
  close.current = onClose

  useEffect(() => {
    const panel = ref.current
    const candidate = document.activeElement as (Element & { focus?: () => void }) | null
    const previous = candidate && typeof candidate.focus === 'function' ? candidate : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        panel?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panel?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel?.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const items = focusable()
    ;(items[0] ?? panel)?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus?.()
    }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        data-slideover-backdrop
        onMouseDown={() => close.current()}
        className="fixed inset-0 z-19 bg-black bg-opacity-32"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleID}
        className="fixed top-[var(--app-topbar-height)] right-0 bottom-0 w-[min(370px,100vw)] bg-theme-surface-1 border-l border-theme-border overflow-y-auto z-20 shadow-xl"
      >
        <header
          className="flex items-center justify-between px-5 py-4 border-b border-theme-border sticky top-0 bg-theme-surface-1"
        >
          <strong id={titleID} className="text-base font-medium text-theme-text-primary">{title}</strong>
          <button
            onClick={() => close.current()}
            aria-label="Close"
            className="bg-transparent border-none text-theme-text-secondary cursor-pointer text-xl leading-4 hover:text-theme-text-primary transition-colors"
          >
            ×
          </button>
        </header>
        <div className="p-5 grid gap-4">{children}</div>
      </div>
    </>
  )
}

/** A label/value row inside a slide-over. */
export function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2 border-b border-theme-border last:border-0">
      <span className="text-sm text-theme-text-secondary font-medium">{label}</span>
      <span className="text-sm font-semibold text-right text-theme-text-primary">
        {children}
      </span>
    </div>
  )
}

/**
 * A multi-select filter rail with live counts (UI-SPEC §5).
 *
 * `counted` says where the numbers came from, and it is required rather than
 * optional on purpose. The spec's whole point about this rail is that a count
 * taken from the loaded page is a lie; a rail that renders identically in both
 * cases makes that lie invisible, so the caller has to state which it is and
 * the component prints it.
 */
export function FilterRail({
  groups,
  counted,
}: {
  groups: {
    label: string
    options: { value: string; count: number }[]
    selected: string
    onChange: (v: string) => void
  }[]
  counted: 'all' | 'loaded'
}) {
  return (
    <Card title="Filters">
      {groups.map((g, i) => (
        <fieldset
          key={g.label}
          className="border-0 p-0"
          style={{ margin: `${i === 0 ? 0 : 12}px 0 0`, minWidth: 0 }}
        >
          <legend
            className="text-xs font-semibold text-text-secondary mb-2"
            style={{ padding: 0, marginBottom: 6 }}
          >
            {g.label}
          </legend>
          <div className="grid gap-2">
            <FilterOption
              label="All"
              count={g.options.reduce((n, o) => n + o.count, 0)}
              active={g.selected === ''}
              onClick={() => g.onChange('')}
            />
            {withSelected(g.options, g.selected).map((o) => (
              <FilterOption
                key={o.value}
                label={o.value}
                count={o.count}
                active={g.selected === o.value}
                onClick={() => g.onChange(o.value)}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="text-xs text-text-muted mt-3">
        {counted === 'all'
          ? 'Counts are over every matching row, not the page on screen.'
          : 'Counts are over the rows loaded here, which is everything this ' +
            'endpoint returns.'}
      </div>
    </Card>
  )
}

/**
 * Keep the selected option in the list even when nothing matches it.
 *
 * An option with no rows drops out of a count query, so selecting it makes it
 * disappear — and then the rail shows nothing highlighted above an empty grid,
 * with no indication that a filter is the reason. Observed exactly that on the
 * client list: the default "online" filter matched none of 14 clients, so the
 * screen said "0 of 14" beside a rail where no option looked selected.
 *
 * Showing it with a zero is both the explanation and the way back out.
 */
function withSelected(
  options: { value: string; count: number }[],
  selected: string,
) {
  if (selected === '' || options.some((o) => o.value === selected)) return options
  return [{ value: selected, count: 0 }, ...options]
}

function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
        active 
          ? 'bg-theme-accent text-white' 
          : 'bg-theme-surface-2 hover:bg-theme-surface-3 text-theme-text-primary border border-theme-border'
      }`}
    >
      <span>{label}</span>
      <span className="num">{count.toLocaleString()}</span>
    </button>
  )
}

/** Page controls with a page-size selector (UI-SPEC §5, default 100). */
export function Pager({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number
  limit: number
  offset: number
  onChange: (limit: number, offset: number) => void
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  return (
    <div className="pager flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <span className="num text-theme-text-secondary">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="pager-spacer flex-1" />
      <label className="inline-flex items-center gap-2">
        <span className="text-sm text-theme-text-secondary">Rows</span>
        <select
          value={limit}
          onChange={(e) => onChange(Number(e.target.value), 0)}
          className="px-3 py-2 bg-theme-surface-0 text-theme-text-primary border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-accent"
        >
          {[50, 100, 250, 500, 1000].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button disabled={offset === 0} onClick={() => onChange(limit, Math.max(0, offset - limit))}>
          Previous
        </Button>
        <Button disabled={to >= total} onClick={() => onChange(limit, offset + limit)}>
          Next
        </Button>
      </div>
    </div>
  )
}


/**
 * A labelled checkbox.
 *
 * Shared rather than local because two screens now gate an irreversible action
 * behind one: applying a site model, and un-adopting a device. The second is
 * the one with no rollback armed.
 */
export function Toggle({
  label,
  on,
  onChange,
  disabled = false,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-theme-accent peer-focus:ring-offset-2 ${
          on ? 'bg-theme-accent' : 'bg-theme-border'
        }`}></div>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          on ? 'translate-x-7' : 'translate-x-0'
        }`}></div>
      </div>
      <span className={disabled ? 'opacity-50' : ''}>{label}</span>
    </label>
  )
}
