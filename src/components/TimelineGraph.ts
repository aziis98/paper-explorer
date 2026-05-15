import * as d3 from 'd3'
import type { Paper, Connection } from '../types'
import { CONFIG } from '../config'

export interface TimelineGraphOptions {
  onPaperClick: (paper: Paper, ev: MouseEvent) => void
  onHover: (paper: Paper, ev: MouseEvent) => void
  onHoverLeave: () => void
}

export function TimelineGraph(
  svgEl: SVGSVGElement,
  options: TimelineGraphOptions,
) {
  const MARGIN = { top: 40, right: 50, bottom: 60, left: 80 }
  const getW = () => svgEl.parentElement?.clientWidth || window.innerWidth
  const getH = () => svgEl.parentElement?.clientHeight || window.innerHeight

  let cW = getW() - MARGIN.left - MARGIN.right
  let cH = getH() - MARGIN.top - MARGIN.bottom

  let xScaleBase: d3.ScaleTime<number, number> | null = null
  let yScaleBase: d3.ScaleContinuousNumeric<number, number, any> | null = null
  let currentTransform = d3.zoomIdentity

  const svg = d3.select(svgEl)
  svg
    .attr('width', '100%')
    .attr('height', '100%')
  svg.selectAll('*').remove()

  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#f8fafc')

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
  const gGrid = g.append('g').attr('class', 'grid')
  const gLines = g.append('g')
  const gDots = g.append('g')
  const gXAxis = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${cH})`)
  const gYAxis = g.append('g').attr('class', 'axis')

  // Labels
  g.append('text').attr('class', 'x-label').attr('x', cW / 2).attr('y', cH + 46).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#94a3b8').text('Publication date')
  g.append('text').attr('class', 'y-label').attr('transform', 'rotate(-90)').attr('x', -cH / 2).attr('y', -62).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#94a3b8').text('Total citations')

  const defs = svg.append('defs')
  defs.append('clipPath').attr('id', 'clip').append('rect').attr('width', cW + 2).attr('height', cH + 2).attr('x', -1).attr('y', -1)
  
  gLines.attr('clip-path', 'url(#clip)')
  gDots.attr('clip-path', 'url(#clip)')

  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 60])
    .on('zoom', (ev) => {
      const t = ev.transform
      currentTransform = d3.zoomIdentity.translate(t.x, 0).scale(t.k)
      doDraw()
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

  let localPapers: Paper[] = []
  let localConnections: Connection[] = []
  let localSelectedId: string | null = null
  let localHoveredId: string | null = null
  let localDijkstraMode = false

  const colorScale = d3.scaleSequential(CONFIG.GRAPH.DIJKSTRA_INTERPOLATOR)

  function buildScales() {
    const dates = localPapers.filter(p => p.date).map(p => new Date(p.date!))
    if (!dates.length) { xScaleBase = null; return false; }
    const maxC = Math.max(...localPapers.map(p => p.citations), 0)
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    minDate.setMonth(minDate.getMonth() - 6)
    maxDate.setMonth(maxDate.getMonth() + 6)

    xScaleBase = d3.scaleTime().domain([minDate, maxDate]).range([0, cW])
    yScaleBase = d3.scaleSymlog().constant(1).domain([0, maxC * 1.18]).range([cH, 0]).nice()
    return true
  }

  function getNodeY(p: Paper) {
    if (!yScaleBase) return 0
    const baseY = yScaleBase(p.citations)
    const samePos = localPapers.filter(pp => pp.date === p.date && pp.citations === p.citations)
    if (samePos.length <= 1) return baseY
    const idx = samePos.findIndex(pp => pp.id === p.id)
    return baseY - idx * 12
  }

  function doDraw() {
    if (!xScaleBase || !yScaleBase) return
    const xs = currentTransform.rescaleX(xScaleBase)

    const distances = new Map<string, number>()
    const activeSourceId = localHoveredId || localSelectedId
    if (localDijkstraMode && activeSourceId) {
      const queue = [activeSourceId]
      distances.set(activeSourceId, 0)
      while (queue.length > 0) {
        const uId = queue.shift()!
        const d = distances.get(uId)!
        localConnections.forEach(c => {
          if (c.fromId === uId && !distances.has(c.toId)) { distances.set(c.toId, d + 1); queue.push(c.toId); }
          else if (c.toId === uId && !distances.has(c.fromId)) { distances.set(c.fromId, d + 1); queue.push(c.fromId); }
        })
      }
    }

    const maxDist = Math.max(3, ...distances.values())
    colorScale.domain([0, maxDist])

    gXAxis.call(d3.axisBottom(xs).ticks(cW / 80))
    gYAxis.call(d3.axisLeft(yScaleBase).ticks(5, d3.format(',d')))
    gGrid.call(d3.axisLeft(yScaleBase).tickSize(-cW).tickFormat(() => ''))
      .selectAll('.tick line').attr('stroke', '#f1f5f9')

    const lineData = localConnections.map(c => {
      const f = localPapers.find(p => p.id === c.fromId)
      const t = localPapers.find(p => p.id === c.toId)
      return f && t ? { f, t } : null
    }).filter(Boolean) as { f: Paper; t: Paper }[]

    const lines = gLines.selectAll('path.rl').data(lineData)
    lines.enter().append('path').attr('class', 'rl').merge(lines as any)
      .attr('d', d => {
        const x1 = xs(new Date(d.t.date!)), y1 = getNodeY(d.t),
              x2 = xs(new Date(d.f.date!)), y2 = getNodeY(d.f)
        const dx = x2 - x1, cp = Math.abs(dx) * 0.45
        const targetX = x2 - (d.f.id === localSelectedId ? 12 : d.f.isSecondary ? 7 : 10)
        return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${targetX - cp} ${y2}, ${targetX} ${y2}`
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (localDijkstraMode && activeSourceId) {
          const d1 = distances.get(d.f.id), d2 = distances.get(d.t.id)
          if (d1 !== undefined && d2 !== undefined) return colorScale(Math.min(d1, d2))
        }
        return CONFIG.GRAPH.EDGE_COLOR_DEFAULT
      })
      .attr('opacity', d => {
        if (localDijkstraMode && activeSourceId) {
          return distances.has(d.f.id) && distances.has(d.t.id) ? 0.8 : 0.05
        }
        return 0.25
      })
    lines.exit().remove()

    const dots = gDots.selectAll('circle.pdot').data(localPapers)
    dots.enter().append('circle').attr('class', 'pdot')
      .on('mousemove', (ev, d) => options.onHover(d, ev))
      .on('mouseleave', () => options.onHoverLeave())
      .on('click', (ev, d) => { ev.stopPropagation(); options.onPaperClick(d, ev); })
      .merge(dots as any)
      .attr('cx', d => d.date ? xs(new Date(d.date)) : -999)
      .attr('cy', d => getNodeY(d))
      .attr('r', d => d.id === localSelectedId ? 10 : d.isSecondary ? 5 : 8)
      .attr('fill', d => {
        if (localDijkstraMode && activeSourceId) {
          const dist = distances.get(d.id)
          if (dist !== undefined) return colorScale(dist)
        }
        return d.isSecondary ? CONFIG.GRAPH.NODE_COLOR_SECONDARY : d.color || CONFIG.GRAPH.NODE_COLOR_DEFAULT
      })
      .attr('fill-opacity', d => {
        if (localDijkstraMode && activeSourceId) return distances.has(d.id) ? 1 : 0.1
        if (localHoveredId) {
          const connected = d.id === localHoveredId || localConnections.some(c => (c.fromId === localHoveredId && c.toId === d.id) || (c.toId === localHoveredId && c.fromId === d.id))
          return connected ? 1 : 0.1
        }
        return d.isSecondary ? 0.62 : 0.88
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.id === localSelectedId ? 2.5 : 2)
    dots.exit().remove()
  }

  function resize() {
    cW = getW() - MARGIN.left - MARGIN.right
    cH = getH() - MARGIN.top - MARGIN.bottom

    svg
      .select('#clip rect')
      .attr('width', cW + 2)
      .attr('height', cH + 2)

    gXAxis.attr('transform', `translate(0,${cH})`)

    svg
      .select('.x-label')
      .attr('x', cW / 2)
      .attr('y', cH + 46)

    svg
      .select('.y-label')
      .attr('x', -cH / 2)

    if (localPapers.length && buildScales()) doDraw()
  }

  const resizeObserver = new ResizeObserver(() => requestAnimationFrame(resize))
  if (svgEl.parentElement) resizeObserver.observe(svgEl.parentElement)

  function resetView() {
    if (!xScaleBase) return
    const dates = localPapers
      .filter(p => !p.isSecondary && p.date)
      .map(p => new Date(p.date!))
    if (!dates.length) return

    const vMin = new Date(Math.min(...dates.map(d => d.getTime())))
    const vMax = new Date(Math.max(...dates.map(d => d.getTime())))
    vMin.setMonth(vMin.getMonth() - 2)
    vMax.setMonth(vMax.getMonth() + 2)

    const p0 = xScaleBase(vMin),
      p1 = xScaleBase(vMax)
    const k = cW / (p1 - p0)
    const t = d3.zoomIdentity.translate(-p0 * k, 0).scale(k)
    svg.call(zoomBehavior.transform, t)
  }

  function unmount() {
    resizeObserver.disconnect()
    svg.selectAll('*').remove()
  }

  return {
    update(papers: Paper[], connections: Connection[], selectedId: string | null, hoveredId: string | null, dijkstraMode: boolean) {
      localPapers = papers
      localConnections = connections
      localSelectedId = selectedId
      localHoveredId = hoveredId
      localDijkstraMode = dijkstraMode
      if (papers.length > 0) {
        buildScales()
        doDraw()
      }
    },
    unmount,
    resetView,
  }
}
