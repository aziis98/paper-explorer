import * as d3 from 'd3'
import type { Paper, Connection } from '../types'
import { fmt } from '../utils'

export interface GraphOptions {
  onPaperClick: (paper: Paper, ev: MouseEvent) => void
  onHover: (paper: Paper, ev: MouseEvent) => void
  onHoverLeave: () => void
}

export function Graph(
  svgEl: SVGSVGElement,
  options: GraphOptions,
) {
  const MARGIN = {
    top: 40,
    right: 50,
    bottom: 60,
    left: 80,
  }
  const getW = () => svgEl.parentElement?.clientWidth || window.innerWidth
  const getH = () => svgEl.parentElement?.clientHeight || window.innerHeight

  let cW = getW() - MARGIN.left - MARGIN.right
  let cH = getH() - MARGIN.top - MARGIN.bottom

  let xScaleBase: d3.ScaleTime<number, number> | null = null
  let yScaleBase: d3.ScaleContinuousNumeric<
    number,
    number,
    any
  > | null = null
  let currentTransform = d3.zoomIdentity

  const svg = d3
    .select<SVGSVGElement, unknown>(svgEl)
    .attr('width', getW())
    .attr('height', getH())

  svg.selectAll('*').remove()

  svg
    .append('rect')
    .attr('width', getW())
    .attr('height', getH())
    .attr('fill', '#f8fafc')

  const g = svg
    .append('g')
    .attr(
      'transform',
      `translate(${MARGIN.left},${MARGIN.top})`,
    )

  const gGrid = g.append('g').attr('class', 'grid')
  const gLines = g.append('g')
  const gDots = g.append('g')
  const gXAxis = g
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${cH})`)
  const gYAxis = g.append('g').attr('class', 'axis')

  g.append('text')
    .attr('x', cW / 2)
    .attr('y', cH + 46)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#94a3b8')
    .attr('font-family', 'system-ui')
    .text('Publication date')

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
    .attr('fill', '#94a3b8')

  gLines.attr('clip-path', 'url(#clip)')
  gDots.attr('clip-path', 'url(#clip)')

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 60])
    .on('start', () => {
      svgEl.style.cursor = 'grabbing'
    })
    .on(
      'zoom',
      (ev: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = ev.transform
        currentTransform = d3.zoomIdentity
          .translate(t.x, 0)
          .scale(t.k)
        if (xScaleBase) doDraw()
      },
    )
    .on('end', () => {
      svgEl.style.cursor = ''
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

  let localPapers: Paper[] = []
  let localConnections: Connection[] = []
  let localSelectedId: string | null = null
  let localHoveredId: string | null = null
  let lastPaperIds = new Set<string>()

  function xsc() {
    return currentTransform.rescaleX(xScaleBase!)
  }

  function buildScales(newPapers: Paper[] = []) {
    const dates = localPapers
      .filter(p => p.date)
      .map(p => new Date(p.date!))
    if (!dates.length) {
      xScaleBase = null
      return false
    }
    const cites = localPapers.map(p => p.citations)
    const minDate = new Date(
      Math.min(...dates.map(d => d.getTime())),
    )
    const maxDate = new Date(
      Math.max(...dates.map(d => d.getTime())),
    )
    minDate.setMonth(minDate.getMonth() - 6)
    maxDate.setMonth(maxDate.getMonth() + 6)
    const maxC = Math.max(...cites)

    if (xScaleBase) {
      const cur = xsc()
      let vMin = cur.invert(0),
        vMax = cur.invert(cW)

      const addedDates = newPapers
        .filter(p => p.date)
        .map(p => new Date(p.date!))
      if (addedDates.length > 0) {
        const nMin = new Date(
          Math.min(...addedDates.map(d => d.getTime())),
        )
        const nMax = new Date(
          Math.max(...addedDates.map(d => d.getTime())),
        )

        // 1 month padding for new nodes
        const pnMin = new Date(nMin)
        pnMin.setMonth(pnMin.getMonth() - 1)
        const pnMax = new Date(nMax)
        pnMax.setMonth(pnMax.getMonth() + 1)

        if (pnMin < vMin) vMin = pnMin
        if (pnMax > vMax) vMax = pnMax
      }

      xScaleBase = d3
        .scaleTime()
        .domain([minDate, maxDate])
        .range([0, cW])
      const p0 = xScaleBase(vMin),
        p1 = xScaleBase(vMax)
      const k = cW / (p1 - p0)
      currentTransform = d3.zoomIdentity
        .translate(-p0 * k, 0)
        .scale(k)
      svg.call(zoomBehavior.transform, currentTransform)
    } else {
      xScaleBase = d3
        .scaleTime()
        .domain([minDate, maxDate])
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
    const samePos = localPapers
      .filter(
        pp =>
          pp.date === p.date &&
          pp.citations === p.citations,
      )
      .sort((a, b) => a.id.localeCompare(b.id))

    if (samePos.length <= 1) return baseY
    const idx = samePos.findIndex(pp => pp.id === p.id)
    return baseY - idx * 12
  }

  function doDraw() {
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

    gXAxis.call(
      d3
        .axisBottom(xs)
        .ticks(Math.max(3, Math.round(cW / 90))),
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

    const lineData = localConnections
      .map(c => ({
        ...c,
        f: localPapers.find(p => p.id === c.fromId),
        t: localPapers.find(p => p.id === c.toId),
      }))
      .filter(
        (c): c is Connection & { f: Paper; t: Paper } =>
          !!(c.f?.date && c.t?.date),
      )

    const lines = gLines
      .selectAll<
        SVGPathElement,
        (typeof lineData)[0]
      >('.rl')
      .data(lineData, d => d.fromId + d.toId)

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
      .attr('opacity', d => {
        if (!localHoveredId) return 0.6
        if (
          d.fromId === localHoveredId ||
          d.toId === localHoveredId
        )
          return 1
        return 0.1
      })
      .attr('stroke', d => d.f?.color || '#94a3b8')
      .attr('stroke-width', d =>
        localHoveredId &&
        (d.fromId === localHoveredId ||
          d.toId === localHoveredId)
          ? 2.5
          : 1.5,
      )

    gLines
      .selectAll<
        SVGPathElement,
        (typeof lineData)[0]
      >('.rl')
      .attr('d', d => {
        const x1 = xs(new Date(d.t.date!)),
          y1 = getNodeY(d.t),
          x2 = xs(new Date(d.f.date!)),
          y2 = getNodeY(d.f)
        const dx = x2 - x1
        const cp = Math.abs(dx) * 0.45
        const targetX =
          x2 -
          (d.f.id === localSelectedId
            ? 12
            : d.f.isSecondary
              ? 7
              : 10)
        return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${targetX - cp} ${y2}, ${targetX} ${y2}`
      })

    lines.exit().remove()

    const dots = gDots
      .selectAll<SVGCircleElement, Paper>('.pdot')
      .data(localPapers, (d: Paper) => d.id)

    const entered = dots
      .enter()
      .append('circle')
      .attr('class', 'pdot')
      .attr('cx', d =>
        d.date ? xs(new Date(d.date)) : -999,
      )
      .attr('cy', d => getNodeY(d))
      .attr('r', 0)
      .attr('fill', d => (d.isSecondary ? '#64748b' : d.color))
      .attr('fill-opacity', d => {
        if (localHoveredId) {
          const connected =
            d.id === localHoveredId ||
            localConnections.some(
              c =>
                (c.fromId === localHoveredId &&
                  c.toId === d.id) ||
                (c.toId === localHoveredId &&
                  c.fromId === d.id),
            )
          return connected ? 1 : 0.1
        }
        return d.isSecondary ? 0.62 : 0.88
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', d => (d.isSecondary ? 1.5 : 2))
      .on('mousemove', (ev: MouseEvent, d: Paper) => {
        options.onHover(d, ev)
      })
      .on('mouseleave', () => {
        options.onHoverLeave()
      })
      .on('click', (ev: MouseEvent, d: Paper) => {
        ev.stopPropagation()
        options.onPaperClick(d, ev)
      })

    entered
      .transition()
      .duration(380)
      .ease(d3.easeBounceOut)
      .attr('r', d => (d.isSecondary ? 5 : 8))

    dots
      .merge(entered)
      .attr('cx', d =>
        d.date ? xs(new Date(d.date)) : -999,
      )
      .attr('cy', d => yScaleBase!(d.citations))
      .attr('r', d =>
        d.id === localSelectedId ? 10 : d.isSecondary ? 5 : 8,
      )
      .attr('stroke-width', d =>
        d.id === localSelectedId ? 2.5 : d.isSecondary ? 1.5 : 2,
      )
      .attr('fill', d => (d.isSecondary ? '#64748b' : d.color))
      .attr('fill-opacity', d => {
        if (localHoveredId) {
          const connected =
            d.id === localHoveredId ||
            localConnections.some(
              c =>
                (c.fromId === localHoveredId &&
                  c.toId === d.id) ||
                (c.toId === localHoveredId &&
                  c.fromId === d.id),
            )
          return connected ? 1 : 0.1
        }
        return d.isSecondary ? 0.62 : 0.88
      })

    dots
      .exit()
      .transition()
      .duration(200)
      .attr('r', 0)
      .remove()
  }

  function resize() {
    cW = getW() - MARGIN.left - MARGIN.right
    cH = getH() - MARGIN.top - MARGIN.bottom
    svg
      .attr('width', '100%')
      .attr('height', '100%')
    svg
      .select('rect')
      .attr('width', getW())
      .attr('height', getH())
    gXAxis.attr('transform', `translate(0,${cH})`)
    svg
      .select('text[text-anchor="middle"]')
      .attr('x', cW / 2)
      .attr('y', cH + 46)
    svg
      .select('clipPath rect')
      .attr('width', cW + 2)
      .attr('height', cH + 2)
    if (localPapers.length && buildScales()) doDraw()
  }

  const resizeObserver = new ResizeObserver(() => {
    // requestAnimationFrame prevents "ResizeObserver loop limit exceeded"
    requestAnimationFrame(() => resize())
  })
  if (svgEl.parentElement) {
    resizeObserver.observe(svgEl.parentElement)
  } else {
    window.addEventListener('resize', resize)
  }

  return {
    update(
      papers: Paper[],
      connections: Connection[],
      selectedId: string | null,
      hoveredId: string | null,
    ) {
      const addedPapers = papers.filter(
        p => !lastPaperIds.has(p.id),
      )
      lastPaperIds = new Set(papers.map(p => p.id))

      localPapers = papers
      localConnections = connections
      localSelectedId = selectedId
      localHoveredId = hoveredId

      if (papers.length === 0) {
        gDots.selectAll('*').remove()
        gLines.selectAll('*').remove()
        gGrid.selectAll('*').remove()
        gXAxis.selectAll('*').remove()
        gYAxis.selectAll('*').remove()
        xScaleBase = null
      } else {
        if (buildScales(addedPapers)) doDraw()
      }
    },
    unmount() {
      svg.selectAll('*').remove()
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
    },
  }
}
