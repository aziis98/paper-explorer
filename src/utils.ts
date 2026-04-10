export const COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#a855f7',
]

export const fmt = (n: number) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1) + 'K'
      : n.toLocaleString()

export const trunc = (s: string | null | undefined, n: number) =>
  s && s.length > n
    ? s.slice(0, n) + '...'
    : s || 'Untitled'

export const sid = (id: string) =>
  id.replace('https://openalex.org/', '')

export const getColor = (idx: number) =>
  COLORS[idx % COLORS.length]

export function getAuthors(w: any) {
  if (!w.authorships?.length) return 'Unknown authors'
  const n = w.authorships.slice(0, 3).map((a: any) => {
    const p = (a.author?.display_name || '')
      .trim()
      .split(' ')
    return p.length > 1 ? p[p.length - 1] : p[0] || ''
  })
  if (w.authorships.length > 3) n.push('et al.')
  return n.join(', ')
}

export function getArXivUrl(w: any) {
  if (!w.locations) return null
  const loc = w.locations.find(
    (l: any) =>
      l.source?.id === 'https://openalex.org/S4306400194' ||
      l.source?.display_name
        ?.toLowerCase()
        .includes('arxiv'),
  )
  return loc?.landing_page_url || null
}

export function getPdfUrl(w: any) {
  return w.primary_location?.pdf_url || null
}

export function formatDate(d: string | null | undefined) {
  return d ? d.substring(0, 10) : null
}

export function getMinDate(w: any) {
  const dates = [formatDate(w.publication_date), formatDate(w.created_date)].filter(Boolean)
  if (!dates.length) return null
  return dates.sort()[0]
}

export function getMinYear(w: any) {
  const d = getMinDate(w)
  return d ? parseInt(d.substring(0, 4), 10) : (w.publication_year || null)
}

export function $(
  tag: string,
  props: any = {},
  ...children: (
    | Node
    | string
    | null
    | undefined
    | boolean
  )[]
) {
  const el = document.createElement(tag)
  Object.entries(props).forEach(([key, val]) => {
    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, val as any)
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val)
    } else if (key === 'className' || key === 'class') {
      el.className = val as string
    } else {
      ;(el as any)[key] = val
    }
  })
  children.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return
    if (typeof c === 'string' || typeof c === 'number') {
      el.appendChild(document.createTextNode(String(c)))
    } else {
      el.appendChild(c as Node)
    }
  })
  return el
}
