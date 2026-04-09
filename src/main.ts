import * as d3 from 'd3'

interface Paper {
  id: string
  title: string
  year: number | null
  citations: number
  authors: string
  color: string
  doi?: string | null
  isRef: boolean
  parentId?: string | null
  refsLoaded: boolean
  referencedWorks?: string[] | null
  metadataLoaded?: boolean
  arxivUrl?: string | null
}

interface Connection {
  fromId: string
  toId: string
}

const OPENALEX_API = 'https://api.openalex.org'

const COLORS = [
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

const MARGIN = {
  top: 40,
  right: 50,
  bottom: 60,
  left: 80,
}

let papers: Paper[] = []
let connections: Connection[] = []
let selectedId: string | null = null
let xScaleBase: d3.ScaleLinear<number, number> | null = null
let yScaleBase: d3.ScaleContinuousNumeric<
  number,
  number,
  any
> | null = null
let currentTransform = d3.zoomIdentity
let cW: number,
  cH: number,
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>
let gDots: d3.Selection<
  SVGGElement,
  unknown,
  HTMLElement,
  any
>
let gLines: d3.Selection<
  SVGGElement,
  unknown,
  HTMLElement,
  any
>
let gGrid: d3.Selection<
  SVGGElement,
  unknown,
  HTMLElement,
  any
>
let gXAxis: d3.Selection<
  SVGGElement,
  unknown,
  HTMLElement,
  any
>
let gYAxis: d3.Selection<
  SVGGElement,
  unknown,
  HTMLElement,
  any
>
let searchTimer: number | undefined
let currentRefs: any[] = []
let currentCits: any[] = []
let activeTab: 'refs' | 'cits' = 'refs'
let sortKey: string = 'citations'
let sortDesc: boolean = true

const fmt = (n: number) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1) + 'K'
      : n.toLocaleString()

const trunc = (s: string | null | undefined, n: number) =>
  s && s.length > n
    ? s.slice(0, n) + '...'
    : s || 'Untitled'

const sid = (id: string) =>
  id.replace('https://openalex.org/', '')

const getColor = (idx: number) =>
  COLORS[idx % COLORS.length]

function getAuthors(w: any) {
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

function getArXivUrl(w: any) {
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

function $(
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

function xsc() {
  return currentTransform.rescaleX(xScaleBase!)
}

function initChart() {
  cW = window.innerWidth - MARGIN.left - MARGIN.right
  cH = window.innerHeight - MARGIN.top - MARGIN.bottom
  const svg = d3
    .select<SVGSVGElement, unknown>('#chart-svg')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight)

  svg.selectAll('*').remove()

  svg
    .append('rect')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight)
    .attr('fill', '#f8fafc')

  const g = svg
    .append('g')
    .attr(
      'transform',
      `translate(${MARGIN.left},${MARGIN.top})`,
    )

  gGrid = g.append('g').attr('class', 'grid')
  gLines = g.append('g')
  gDots = g.append('g')
  gXAxis = g
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${cH})`)
  gYAxis = g.append('g').attr('class', 'axis')

  g.append('text')
    .attr('x', cW / 2)
    .attr('y', cH + 46)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#94a3b8')
    .attr('font-family', 'system-ui')
    .text('Publication year')

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -cH / 2)
    .attr('y', -62)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#94a3b8')
    .attr('font-family', 'system-ui')
    .text('Total citations')

  const defs = svg.append('defs')

  defs
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', cW + 2)
    .attr('height', cH + 2)
    .attr('x', -1)
    .attr('y', -1)

  defs
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', '#6366f1')
    .attr('opacity', 0.5)

  gLines.attr('clip-path', 'url(#clip)')
  gDots.attr('clip-path', 'url(#clip)')

  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 60])
    .on(
      'zoom',
      (ev: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = ev.transform
        currentTransform = d3.zoomIdentity
          .translate(t.x, 0)
          .scale(t.k)
        if (xScaleBase) redraw()
      },
    )

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)
  ;['search-panel', 'left-panel', 'right-panel'].forEach(
    id => {
      const el = document.getElementById(id)
      if (!el) return
      el.addEventListener('mousedown', e =>
        e.stopPropagation(),
      )
      el.addEventListener(
        'wheel',
        e => e.stopPropagation(),
        { passive: false },
      )
    },
  )
}

function buildScales() {
  const years = papers
    .map(p => p.year)
    .filter((y): y is number => y !== null)
  if (!years.length) return false
  const cites = papers.map(p => p.citations)
  const minY = Math.min(...years) - 3,
    maxY = Math.max(...years) + 3
  const maxC = Math.max(...cites)

  if (xScaleBase) {
    const cur = xsc()
    const vMin = cur.invert(0),
      vMax = cur.invert(cW)
    xScaleBase = d3
      .scaleLinear()
      .domain([minY, maxY])
      .range([0, cW])
    const p0 = xScaleBase(vMin),
      p1 = xScaleBase(vMax)
    const k = cW / (p1 - p0)
    currentTransform = d3.zoomIdentity
      .translate(-p0 * k, 0)
      .scale(k)
    d3.select<SVGSVGElement, unknown>('#chart-svg').call(
      zoomBehavior.transform,
      currentTransform,
    )
  } else {
    xScaleBase = d3
      .scaleLinear()
      .domain([minY, maxY])
      .range([0, cW])
  }

  yScaleBase = d3
    .scaleSymlog()
    .constant(1)
    .domain([0, maxC * 1.18])
    .range([cH, 0])
    .nice()
  return true
}

function getNodeY(p: Paper) {
  if (!yScaleBase) return 0
  const baseY = yScaleBase(p.citations)
  const samePos = papers
    .filter(
      pp =>
        pp.year === p.year && pp.citations === p.citations,
    )
    .sort((a, b) => a.id.localeCompare(b.id))

  if (samePos.length <= 1) return baseY
  const idx = samePos.findIndex(pp => pp.id === p.id)
  return baseY - idx * 12
}

function redraw() {
  if (!xScaleBase || !yScaleBase) return
  const xs = xsc()

  gGrid.call(
    d3
      .axisLeft(yScaleBase)
      .ticks(5)
      .tickSize(-cW)
      .tickFormat(() => ''),
  )
  gGrid
    .selectAll('line')
    .attr('stroke', '#eef2f7')
    .attr('stroke-dasharray', '3,3')
  gGrid.select('.domain').remove()

  const ticks = xs
    .ticks(Math.max(3, Math.round(cW / 90)))
    .filter(Number.isInteger)
  gXAxis.call(
    d3
      .axisBottom(xs)
      .tickValues(ticks)
      .tickFormat(d3.format('d')),
  )
  gXAxis.select('.domain').attr('stroke', '#e2e8f0')
  gXAxis.selectAll('line').attr('stroke', '#e2e8f0')

  gYAxis.call(
    d3
      .axisLeft(yScaleBase)
      .ticks(5)
      .tickFormat((d: d3.NumberValue) => {
        const val = d as number
        return val >= 1 ? fmt(val) : val.toString()
      }),
  )
  gYAxis.select('.domain').attr('stroke', '#e2e8f0')
  gYAxis.selectAll('line').attr('stroke', '#e2e8f0')

  const lineData = connections
    .map(c => ({
      ...c,
      f: papers.find(p => p.id === c.fromId),
      t: papers.find(p => p.id === c.toId),
    }))
    .filter(
      (c): c is Connection & { f: Paper; t: Paper } =>
        !!(c.f?.year && c.t?.year),
    )

  const lines = gLines
    .selectAll<SVGPathElement, (typeof lineData)[0]>('.rl')
    .data(
      lineData,
      (d: (typeof lineData)[0]) => d.fromId + d.toId,
    )

  const enteredLines = lines
    .enter()
    .append('path')
    .attr('class', 'rl')
    .attr('stroke-opacity', 0)
    .attr('fill', 'none')
    .attr('marker-end', 'url(#arrow)')

  enteredLines
    .transition()
    .duration(500)
    .attr('stroke-opacity', 0.18)

  lines
    .merge(enteredLines)
    .attr(
      'stroke',
      (d: (typeof lineData)[0]) => d.f?.color || '#6366f1',
    )
    .attr('stroke-width', 1)

  gLines
    .selectAll<SVGPathElement, (typeof lineData)[0]>('.rl')
    .attr('d', (d: (typeof lineData)[0]) => {
      const x1 = xs(d.t.year!),
        y1 = getNodeY(d.t),
        x2 = xs(d.f.year!),
        y2 = getNodeY(d.f)
      const dx = x2 - x1
      const cp = Math.abs(dx) * 0.45
      return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`
    })

  lines.exit().remove()

  const dots = gDots
    .selectAll<SVGCircleElement, Paper>('.pdot')
    .data(papers, (d: Paper) => d.id)

  const entered = dots
    .enter()
    .append('circle')
    .attr('class', 'pdot')
    .attr('cx', (d: Paper) => (d.year ? xs(d.year) : -999))
    .attr('cy', (d: Paper) => getNodeY(d))
    .attr('r', 0)
    .attr('fill', (d: Paper) => d.color)
    .attr('fill-opacity', (d: Paper) =>
      d.isRef ? 0.62 : 0.88,
    )
    .attr('stroke', '#fff')
    .attr('stroke-width', (d: Paper) => (d.isRef ? 1.5 : 2))
    .on('mousemove', onHover)
    .on('mouseleave', () => {
      const tt = document.getElementById('tooltip')
      if (tt) tt.style.display = 'none'
    })
    .on('click', onDotClick)

  entered
    .transition()
    .duration(380)
    .ease(d3.easeBounceOut)
    .attr('r', (d: Paper) => (d.isRef ? 5 : 8))

  dots
    .merge(entered)
    .attr('cx', (d: Paper) => (d.year ? xs(d.year) : -999))
    .attr('cy', (d: Paper) => yScaleBase!(d.citations))
    .attr('r', (d: Paper) =>
      d.id === selectedId ? 10 : d.isRef ? 5 : 8,
    )
    .attr('stroke-width', (d: Paper) =>
      d.id === selectedId ? 2.5 : d.isRef ? 1.5 : 2,
    )
    .attr('fill', (d: Paper) => d.color)
    .attr('fill-opacity', (d: Paper) =>
      d.isRef ? 0.62 : 0.88,
    )

  dots
    .exit()
    .transition()
    .duration(200)
    .attr('r', 0)
    .remove()
}

function onHover(ev: MouseEvent, d: Paper) {
  const tt = document.getElementById('tooltip')
  if (!tt) return

  const ttTitle = document.getElementById('tt-title')
  const ttAuth = document.getElementById('tt-auth')
  const ttYear = document.getElementById('tt-year')
  const ttCites = document.getElementById('tt-cites')
  const ttHint = document.getElementById('tt-hint')

  if (ttTitle) ttTitle.textContent = trunc(d.title, 80)
  if (ttAuth) ttAuth.textContent = d.authors
  if (ttYear) ttYear.textContent = d.year?.toString() || '?'
  if (ttCites) ttCites.textContent = fmt(d.citations)
  if (ttHint)
    ttHint.style.display = d.refsLoaded ? 'none' : 'block'

  tt.style.display = 'block'
  tt.style.left =
    Math.min(ev.clientX + 16, window.innerWidth - 250) +
    'px'
  tt.style.top =
    Math.min(ev.clientY - 8, window.innerHeight - 120) +
    'px'
}

async function onDotClick(ev: MouseEvent, d: Paper) {
  ev.stopPropagation()
  selectedId = d.id
  redraw()
  openInfoPanel(d)
}

function openInfoPanel(p: Paper) {
  const rightPanel = document.getElementById('right-panel')
  if (rightPanel) rightPanel.style.display = 'block'

  const colorDot = document.getElementById('info-color-dot')
  if (colorDot) colorDot.style.background = p.color

  const title = document.getElementById('info-title')
  if (title) title.textContent = p.title

  const authors = document.getElementById('info-authors')
  if (authors) authors.textContent = p.authors

  const year = document.getElementById('info-year')
  if (year) year.textContent = p.year?.toString() || '?'

  const cites = document.getElementById('info-cites')
  if (cites) cites.textContent = fmt(p.citations)

  const doi = document.getElementById(
    'info-doi',
  ) as HTMLAnchorElement | null
  if (doi) {
    if (p.doi) {
      doi.href = p.doi.startsWith('http')
        ? p.doi
        : 'https://doi.org/' + p.doi
      doi.style.display = 'flex'
    } else {
      doi.style.display = 'none'
    }
  }

  const arxiv = document.getElementById(
    'info-arxiv',
  ) as HTMLAnchorElement | null
  if (arxiv) {
    if (p.arxivUrl) {
      arxiv.href = p.arxivUrl
      arxiv.style.display = 'flex'
    } else {
      arxiv.style.display = 'none'
    }
  }

  currentRefs = []
  currentCits = []
  renderRefTable()

  if (!p.metadataLoaded) {
    fetchRelatedMetadata(p)
  }
}

async function fetchRelatedMetadata(p: Paper) {
  const spin = document.getElementById('ref-spin')
  const status = document.getElementById('ref-status')

  try {
    // 1. Fetch references (using referenced_works if available)
    let refIds = p.referencedWorks
    if (!refIds) {
      const url = new URL(
        `/works/${sid(p.id)}`,
        OPENALEX_API,
      )
      url.searchParams.set('select', 'id,referenced_works')
      const r = await fetch(url)
      const d = await r.json()
      refIds = d.referenced_works || []
      p.referencedWorks = refIds
    }

    const refQuery =
      refIds && refIds.length
        ? (async () => {
            const url = new URL('/works', OPENALEX_API)
            url.searchParams.set(
              'filter',
              'openalex_id:' +
                refIds.slice(0, 50).map(sid).join('|'),
            )
            url.searchParams.set('per_page', '50')
            url.searchParams.set(
              'select',
              'id,title,publication_year,cited_by_count,doi,locations',
            )
            const r = await fetch(url)
            return r.json()
          })()
        : Promise.resolve({ results: [] })

    // 2. Fetch top citations
    const citQuery = (async () => {
      const url = new URL('/works', OPENALEX_API)
      url.searchParams.set('filter', `cites:${sid(p.id)}`)
      url.searchParams.set('per_page', '50')
      url.searchParams.set('sort', 'cited_by_count:desc')
      url.searchParams.set(
        'select',
        'id,title,publication_year,cited_by_count,doi,locations',
      )
      const r = await fetch(url)
      return r.json()
    })()

    const [refs, cits] = await Promise.all([
      refQuery,
      citQuery,
    ])

    currentRefs = (refs.results || []).map((w: any) => ({
      ...w,
      type: 'ref',
    }))
    currentCits = (cits.results || []).map((w: any) => ({
      ...w,
      type: 'cit',
    }))

    if (status)
      status.textContent = `Found ${refs.results?.length || 0} refs & ${cits.results?.length || 0} citations.`
    p.metadataLoaded = true
    renderRefTable()
  } catch (e) {
    console.error(e)
    if (status)
      status.textContent = 'Error loading metadata.'
  } finally {
    if (spin) spin.style.display = 'none'
  }
}

function renderRefTable() {
  const body = document.getElementById('ref-table-body')
  if (!body) return
  body.innerHTML = ''

  const data =
    activeTab === 'refs' ? currentRefs : currentCits

  const sorted = [...data].sort((a, b) => {
    let vA = a[sortKey],
      vB = b[sortKey]
    if (sortKey === 'title') {
      vA = (a.title || '').toLowerCase()
      vB = (b.title || '').toLowerCase()
    } else if (sortKey === 'citations') {
      vA = a.cited_by_count || 0
      vB = b.cited_by_count || 0
    } else if (sortKey === 'year') {
      vA = a.publication_year || 0
      vB = b.publication_year || 0
    }
    return sortDesc ? (vA < vB ? 1 : -1) : vA > vB ? 1 : -1
  })

  sorted.forEach(w => {
    const inGraph = papers.some(p => p.id === w.id)
    const row = $(
      'tr',
      {
        class: 'ref-row',
        style: {
          borderBottom: '0.5px solid #f8fafc',
          cursor: 'pointer',
          background: inGraph ? '#f0f9ff' : 'transparent',
        },
        onclick: () => handleRowClick(w),
      },
      $(
        'td',
        {
          style: {
            padding: '8px 14px',
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
          title: w.title,
        },
        w.title,
      ),
      $(
        'td',
        {
          style: {
            padding: '8px 4px',
            color: '#64748b',
          },
        },
        String(w.publication_year || '?'),
      ),
      $(
        'td',
        {
          style: {
            padding: '8px 14px',
            color: '#6366f1',
            textAlign: 'right',
          },
        },
        fmt(w.cited_by_count || 0),
      ),
    )
    body.appendChild(row)
  })
}

function handleRowClick(w: any) {
  let p = papers.find(pp => pp.id === w.id)
  if (!p) {
    const parent = papers.find(pp => pp.id === selectedId)
    p = {
      id: w.id,
      title: w.title,
      year: w.publication_year,
      citations: w.cited_by_count,
      authors: w.authors || '?',
      color: parent?.color || '#6366f1',
      doi: w.doi,
      arxivUrl: getArXivUrl(w),
      isRef: w.type === 'ref',
      parentId: selectedId,
      refsLoaded: false,
      referencedWorks: null,
    }
    papers.push(p)
    if (selectedId) {
      if (w.type === 'ref') {
        connections.push({ fromId: selectedId, toId: w.id })
      } else {
        connections.push({ fromId: w.id, toId: selectedId })
      }
    }
    buildScales()
    redraw()
    updateSidebar()
  }
  selectedId = p.id
  openInfoPanel(p)
  redraw()
}

const infoClose = document.getElementById('info-close')
if (infoClose) {
  infoClose.onclick = () => {
    const rightPanel =
      document.getElementById('right-panel')
    if (rightPanel) rightPanel.style.display = 'none'
    selectedId = null
    redraw()
  }
}

document
  .getElementById('load-refs-10')
  ?.addEventListener('click', () => {
    const p = papers.find(pp => pp.id === selectedId)
    if (p) loadRefs(p, 10)
  })
document
  .getElementById('load-refs-all')
  ?.addEventListener('click', () => {
    const p = papers.find(pp => pp.id === selectedId)
    if (p) loadRefs(p)
  })
document
  .getElementById('load-cits-10')
  ?.addEventListener('click', () => {
    const p = papers.find(pp => pp.id === selectedId)
    if (p) loadCitations(p, 10)
  })
document
  .getElementById('load-cits-all')
  ?.addEventListener('click', () => {
    const p = papers.find(pp => pp.id === selectedId)
    if (p) loadCitations(p)
  })
;(window as any).setTab = (tab: 'refs' | 'cits') => {
  activeTab = tab
  const tabRefs = document.getElementById('tab-refs')
  const tabCits = document.getElementById('tab-cits')
  if (tabRefs && tabCits) {
    if (tab === 'refs') {
      tabRefs.style.color = '#6366f1'
      tabRefs.style.fontWeight = '600'
      tabRefs.style.borderBottomColor = '#6366f1'
      tabCits.style.color = '#94a3b8'
      tabCits.style.fontWeight = '500'
      tabCits.style.borderBottomColor = 'transparent'
    } else {
      tabCits.style.color = '#6366f1'
      tabCits.style.fontWeight = '600'
      tabCits.style.borderBottomColor = '#6366f1'
      tabRefs.style.color = '#94a3b8'
      tabRefs.style.fontWeight = '500'
      tabRefs.style.borderBottomColor = 'transparent'
    }
  }
  renderRefTable()
}
;(window as any).setSort = (key: string) => {
  if (sortKey === key) sortDesc = !sortDesc
  else {
    sortKey = key
    sortDesc = true
  }
  renderRefTable()
}

async function loadRefs(paper: Paper, limit?: number) {
  const spin = document.getElementById('ref-spin')
  const status = document.getElementById('ref-status')
  if (spin) spin.style.display = 'inline-block'
  if (status) status.textContent = 'Expanding references...'

  try {
    let refIds = paper.referencedWorks
    if (!refIds) {
      const url = new URL(
        `/works/${sid(paper.id)}`,
        OPENALEX_API,
      )
      url.searchParams.set('select', 'id,referenced_works')
      const r = await fetch(url)
      const d = await r.json()
      refIds = d.referenced_works || []
      paper.referencedWorks = refIds
    }

    if (!refIds || !refIds.length) {
      if (status)
        status.textContent = 'No references found.'
      if (spin) spin.style.display = 'none'
      paper.refsLoaded = true
      return
    }

    const existSet = new Set(papers.map(p => p.id))
    let toFetch = refIds.filter(id => !existSet.has(id))
    const alreadyThere = refIds.filter(id =>
      existSet.has(id),
    )

    if (toFetch.length) {
      const url = new URL('/works', OPENALEX_API)
      url.searchParams.set(
        'filter',
        'openalex_id:' + toFetch.map(sid).join('|'),
      )
      url.searchParams.set('per_page', '50')
      url.searchParams.set('sort', 'cited_by_count:desc')
      url.searchParams.set(
        'select',
        'id,title,publication_year,cited_by_count,authorships,doi,locations',
      )
      const r = await fetch(url)
      const d = await r.json()
      let results = d.results || []
      if (limit) results = results.slice(0, limit)

      results.forEach((w: any) => {
        if (
          !w.publication_year ||
          papers.some(p => p.id === w.id)
        )
          return
        papers.push({
          id: w.id,
          title: w.title || 'Untitled',
          year: w.publication_year,
          citations: w.cited_by_count || 0,
          authors: getAuthors(w),
          color: paper.color,
          doi: w.doi,
          arxivUrl: getArXivUrl(w),
          isRef: true,
          parentId: paper.id,
          refsLoaded: false,
          referencedWorks: null,
        })
      })

      const addedIds = new Set(
        results.map((r: any) => r.id),
      )
      toFetch = toFetch.filter(id => addedIds.has(id))
    }

    ;[...toFetch, ...alreadyThere].forEach(cid => {
      if (
        !connections.some(
          c => c.fromId === paper.id && c.toId === cid,
        )
      ) {
        connections.push({ fromId: paper.id, toId: cid })
      }
    })

    paper.refsLoaded = true
    buildScales()
    redraw()
    updateSidebar()
    renderRefTable()
  } catch (e) {
    console.error(e)
    if (status)
      status.textContent = 'Error loading references.'
  } finally {
    if (spin) spin.style.display = 'none'
  }
}

async function loadCitations(paper: Paper, limit?: number) {
  const spin = document.getElementById('ref-spin')
  const status = document.getElementById('ref-status')
  if (spin) spin.style.display = 'inline-block'
  if (status) status.textContent = 'Expanding citations...'

  try {
    const url = new URL('/works', OPENALEX_API)
    url.searchParams.set('filter', `cites:${sid(paper.id)}`)
    url.searchParams.set('per_page', '50')
    url.searchParams.set('sort', 'cited_by_count:desc')
    url.searchParams.set(
      'select',
      'id,title,publication_year,cited_by_count,authorships,doi,locations',
    )
    const r = await fetch(url)
    const d = await r.json()
    let results = d.results || []
    if (limit) results = results.slice(0, limit)

    results.forEach((w: any) => {
      if (
        !w.publication_year ||
        papers.some(p => p.id === w.id)
      )
        return
      papers.push({
        id: w.id,
        title: w.title || 'Untitled',
        year: w.publication_year,
        citations: w.cited_by_count || 0,
        authors: getAuthors(w),
        color: paper.color,
        doi: w.doi,
        arxivUrl: getArXivUrl(w),
        isRef: true,
        parentId: paper.id,
        refsLoaded: false,
        referencedWorks: null,
      })
    })

    results.forEach((w: any) => {
      if (
        !connections.some(
          c => c.fromId === w.id && c.toId === paper.id,
        )
      ) {
        connections.push({ fromId: w.id, toId: paper.id })
      }
    })

    buildScales()
    redraw()
    updateSidebar()
    renderRefTable()
  } catch (e) {
    console.error(e)
    if (status)
      status.textContent = 'Error loading citations.'
  } finally {
    if (spin) spin.style.display = 'none'
  }
}

function updateSidebar() {
  const direct = papers.filter(p => !p.isRef)
  const emptyMsg = document.getElementById('empty-msg')
  if (emptyMsg)
    emptyMsg.style.display = direct.length
      ? 'none'
      : 'block'

  const refs = papers.length - direct.length
  const totalsBadge =
    document.getElementById('totals-badge')
  if (totalsBadge) {
    totalsBadge.textContent = refs
      ? `${direct.length} + ${refs} refs`
      : direct.length
        ? `${direct.length}`
        : ''
  }

  const list = document.getElementById('papers-list')
  if (!list) return
  list.innerHTML = ''

  direct.forEach(p => {
    const item = $(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '8px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        },
        onMouseEnter: (e: MouseEvent) => {
          ;(
            e.currentTarget as HTMLElement
          ).style.background = '#f1f5f9'
        },
        onMouseLeave: (e: MouseEvent) => {
          ;(
            e.currentTarget as HTMLElement
          ).style.background = 'transparent'
        },
        onClick: () => {
          selectedId = p.id
          openInfoPanel(p)
          redraw()
        },
      },
      $('span', {
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: p.color,
          flexShrink: '0',
          marginTop: '4px',
        },
      }),
      $(
        'div',
        { style: { flex: '1', minWidth: '0' } },
        $(
          'p',
          {
            style: {
              fontSize: '11px',
              fontWeight: '500',
              color: '#1e293b',
              lineHeight: '1.4',
            },
          },
          trunc(p.title, 58),
        ),
        $(
          'p',
          {
            style: {
              fontSize: '10px',
              color: '#94a3b8',
              marginTop: '2px',
            },
          },
          `${p.year || '?'} · ${fmt(p.citations)} citations`,
        ),
      ),
      $(
        'button',
        {
          style: {
            background: '#fee2e2',
            border: 'none',
            cursor: 'pointer',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            fontSize: '9px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: '0',
            opacity: '0.6',
            transition: 'opacity 0.2s',
          },
          onMouseEnter: (e: MouseEvent) => {
            ;(
              e.currentTarget as HTMLElement
            ).style.opacity = '1'
          },
          onMouseLeave: (e: MouseEvent) => {
            ;(
              e.currentTarget as HTMLElement
            ).style.opacity = '0.6'
          },
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            removePaper(p.id)
          },
        },
        '✕',
      ),
    )
    list.appendChild(item)
  })
}

function removePaper(id: string) {
  papers = papers.filter(
    p => p.id !== id && p.parentId !== id,
  )
  connections = connections.filter(
    c => c.fromId !== id && c.toId !== id,
  )
  if (selectedId === id) {
    const rightPanel =
      document.getElementById('right-panel')
    if (rightPanel) rightPanel.style.display = 'none'
    selectedId = null
  }
  if (papers.length && buildScales()) redraw()
  else {
    gDots.selectAll('*').remove()
    gLines.selectAll('*').remove()
    gGrid.selectAll('*').remove()
    gXAxis.selectAll('*').remove()
    gYAxis.selectAll('*').remove()
    xScaleBase = null
  }
  updateSidebar()
  if ((window as any)._lastRes)
    renderResults((window as any)._lastRes)
}

async function doSearch(q: string) {
  if (!q.trim()) {
    hideDropdown()
    return
  }
  const spin = document.getElementById('srch-spin')
  if (spin) spin.style.display = 'inline-block'

  try {
    const url = new URL('/works', OPENALEX_API)
    url.searchParams.set('search', q)
    url.searchParams.set('per_page', '8')
    url.searchParams.set(
      'select',
      'id,title,publication_year,cited_by_count,authorships,doi,referenced_works,locations',
    )
    const r = await fetch(url)
    const d = await r.json()
    renderResults(d.results || [])
  } catch {
    const list = document.getElementById('results-list')
    if (list) {
      list.innerHTML =
        '<p style="font-size:11px;color:#ef4444;padding:12px;text-align:center">Error - check connection</p>'
    }
    const drop = document.getElementById('results-drop')
    if (drop) drop.style.display = 'block'
  }
  if (spin) spin.style.display = 'none'
}

function renderResults(results: any[]) {
  ;(window as any)._lastRes = results
  const list = document.getElementById('results-list')
  const noRes = document.getElementById('no-res')
  const drop = document.getElementById('results-drop')
  if (drop) drop.style.display = 'block'

  if (!list || !noRes) return
  list.innerHTML = ''

  if (!results.length) {
    noRes.style.display = 'block'
    return
  }

  noRes.style.display = 'none'
  const addedIds = new Set(papers.map(p => p.id))

  results.forEach((w, i) => {
    const added = addedIds.has(w.id)
    const item = $(
      'div',
      {
        class: 'ri',
        style: {
          opacity: added ? '0.55' : '1',
          padding: '12px 14px',
          borderBottom: '0.5px solid #f1f5f9',
          cursor: 'pointer',
        },
        onMouseEnter: (e: MouseEvent) => {
          ;(
            e.currentTarget as HTMLElement
          ).style.background = '#f8fafc'
        },
        onMouseLeave: (e: MouseEvent) => {
          ;(
            e.currentTarget as HTMLElement
          ).style.background = 'transparent'
        },
        onClick: () => addFromResult(i),
      },
      $(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          },
        },
        $(
          'p',
          {
            style: {
              fontSize: '12px',
              fontWeight: '500',
              color: '#1e293b',
              lineHeight: '1.4',
              flex: '1',
            },
          },
          trunc(w.title || 'Untitled', 88),
        ),
        $(
          'span',
          {
            style: {
              fontSize: '11px',
              fontWeight: '600',
              color: added ? '#94a3b8' : '#6366f1',
              flexShrink: '0',
            },
          },
          added ? 'Added' : '+ Add',
        ),
      ),
      $(
        'p',
        {
          style: {
            fontSize: '10px',
            color: '#94a3b8',
            marginTop: '3px',
          },
        },
        `${getAuthors(w)} · ${w.publication_year || '?'} · ↑ ${fmt(w.cited_by_count || 0)}`,
      ),
    )
    list.appendChild(item)
  })
}

function addFromResult(i: number) {
  const w = (window as any)._lastRes?.[i]
  if (!w || papers.find(p => p.id === w.id)) return
  const idx = papers.filter(p => !p.isRef).length
  papers.push({
    id: w.id,
    title: w.title || 'Untitled',
    year: w.publication_year,
    citations: w.cited_by_count || 0,
    authors: getAuthors(w),
    color: getColor(idx),
    doi: w.doi,
    arxivUrl: getArXivUrl(w),
    isRef: false,
    parentId: null,
    refsLoaded: false,
    referencedWorks: w.referenced_works || null,
  })
  buildScales()
  redraw()
  updateSidebar()
  renderResults((window as any)._lastRes)
}

function hideDropdown() {
  const drop = document.getElementById('results-drop')
  if (drop) drop.style.display = 'none'
}

const searchInput = document.getElementById(
  'search-input',
) as HTMLInputElement

const searchPanel = document.getElementById('search-panel')

searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer)
  const q = (e.target as HTMLInputElement).value.trim()
  if (!q) {
    hideDropdown()
    const spin = document.getElementById('srch-spin')
    if (spin) spin.style.display = 'none'
    return
  }
  searchTimer = setTimeout(() => doSearch(q), 380) as any
})

searchInput.addEventListener('keydown', e => {
  if ((e as KeyboardEvent).key === 'Escape') hideDropdown()
})

document.addEventListener('click', e => {
  if (
    searchPanel &&
    !searchPanel.contains(e.target as Node)
  ) {
    if (searchInput) searchInput.value = ''
    hideDropdown()
  }
})

window.addEventListener('resize', () => {
  initChart()
  if (papers.length && buildScales()) redraw()
})

initChart()
