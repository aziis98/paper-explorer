import * as d3 from 'd3'
import type { Paper, Connection } from '../types'

export interface NetworkGraphOptions {
  onPaperClick: (paper: Paper, ev: MouseEvent) => void
  onHover: (paper: Paper, ev: MouseEvent) => void
  onHoverLeave: () => void
}

export function NetworkGraph(
  svgEl: SVGSVGElement,
  options: NetworkGraphOptions,
) {
  const getW = () => svgEl.parentElement?.clientWidth || window.innerWidth
  const getH = () => svgEl.parentElement?.clientHeight || window.innerHeight

  const svg = d3.select(svgEl)
  svg
    .attr('width', '100%')
    .attr('height', '100%')
  svg.selectAll('*').remove()

  // Background
  svg.append('rect')
    .attr('class', 'bg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#f8fafc')

  const gMain = svg.append('g').attr('class', 'network-main')
  const gLinks = gMain.append('g').attr('class', 'links')
  const gNodes = gMain.append('g').attr('class', 'nodes')

  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 40])
    .on('zoom', (ev) => {
      gMain.attr('transform', ev.transform.toString())
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

  let simulation: d3.Simulation<any, undefined> | null = null
  let localPapers: Paper[] = []
  let localConnections: Connection[] = []
  let localSelectedId: string | null = null
  let localHoveredId: string | null = null
  let localDijkstraMode = false
  let lastStructureKey = ''

  const colorScale = d3.scaleSequential(
    t => d3.interpolateRgb('#0369a1', '#bae6fd')(t),
  )

  let activeSourceId: string | null = null
  let distances = new Map<string, number>()

  const rScale = d3.scaleSymlog().constant(1).range([4, 18])

  function update(
    papers: Paper[],
    connections: Connection[],
    selectedId: string | null,
    hoveredId: string | null,
    dijkstraMode: boolean,
  ) {
    localPapers = papers
    localConnections = connections
    localSelectedId = selectedId
    localHoveredId = hoveredId
    localDijkstraMode = dijkstraMode

    distances = new Map<string, number>()
    activeSourceId = localHoveredId || localSelectedId
    if (localDijkstraMode && activeSourceId) {
      const queue = [activeSourceId]
      distances.set(activeSourceId, 0)
      while (queue.length > 0) {
        const uId = queue.shift()!
        const d = distances.get(uId)!
        localConnections.forEach(c => {
          if (c.fromId === uId && !distances.has(c.toId)) {
            distances.set(c.toId, d + 1)
            queue.push(c.toId)
          } else if (c.toId === uId && !distances.has(c.fromId)) {
            distances.set(c.fromId, d + 1)
            queue.push(c.fromId)
          }
        })
      }
    }

    const maxDist = Math.max(3, ...distances.values())
    colorScale.domain([0, maxDist])

    const maxC = Math.max(...papers.map(p => p.citations), 1)
    rScale.domain([0, maxC])

    // Force simulation update
    if (!simulation) {
      simulation = d3.forceSimulation(localPapers as any)
        .force('link', d3.forceLink().id((d: any) => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(getW() / 2, getH() / 2))
        .force('x', d3.forceX(getW() / 2).strength(0.05))
        .force('y', d3.forceY(getH() / 2).strength(0.05))
        .on('tick', ticked)
    } else {
      simulation.nodes(localPapers as any)
    }

    const linksData = localConnections.map(c => ({
      source: c.fromId,
      target: c.toId,
    }))
    ;(simulation.force('link') as d3.ForceLink<any, any>).links(linksData)

    const structureKey = papers.map(p => p.id).join(',') + '|' + connections.map(c => `${c.fromId}-${c.toId}`).join(',')
    const structureChanged = structureKey !== lastStructureKey
    lastStructureKey = structureKey

    if (structureChanged) {
      simulation.alpha(0.3).restart()
    } else {
      ticked()
    }

    function ticked() {
      const links = gLinks.selectAll<SVGPathElement, any>('path.link')
        .data(linksData)

      links.enter()
        .append('path')
        .attr('class', 'link')
        .merge(links)
        .attr('d', (d: any) => {
          const x1 = d.source.x,
            y1 = d.source.y,
            x2 = d.target.x,
            y2 = d.target.y
          return `M${x1},${y1}L${x2},${y2}`
        })
        .attr('fill', 'none')
        .attr('stroke', (d: any) => {
          if (localDijkstraMode && activeSourceId) {
            const d1 = distances.get(d.source.id)
            const d2 = distances.get(d.target.id)
            if (d1 !== undefined && d2 !== undefined) return colorScale(Math.min(d1, d2))
          }
          return '#94a3b8'
        })
        .attr('stroke-width', 2)
        .attr('opacity', (d: any) => {
          if (localDijkstraMode && activeSourceId) {
            return distances.has(d.source.id) && distances.has(d.target.id) ? 0.8 : 0.05
          }
          return 0.35
        })

      links.exit().remove()

      const nodes = gNodes.selectAll<SVGCircleElement, any>('circle.node')
        .data(localPapers)

      nodes.enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', d => rScale(d.citations))
        .on('mousemove', (ev, d) => options.onHover(d, ev))
        .on('mouseleave', () => options.onHoverLeave())
        .on('click', (ev, d) => {
          ev.stopPropagation()
          options.onPaperClick(d, ev)
        })
        .call(d3.drag<SVGCircleElement, any>()
          .on('start', (ev, d) => {
            if (!ev.active) simulation?.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (ev, d) => {
            d.fx = ev.x
            d.fy = ev.y
          })
          .on('end', (ev, d) => {
            if (!ev.active) simulation?.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
        )
        .merge(nodes)
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
        .attr('r', d =>
          d.id === localSelectedId ? rScale(d.citations) + 3 : rScale(d.citations),
        )
        .attr('fill', d => {
          if (localDijkstraMode && activeSourceId) {
            const dist = distances.get(d.id)
            if (dist !== undefined) return colorScale(dist)
          }
          return d.isSecondary ? '#94a3b8' : d.color || '#3b82f6'
        })
        .attr('fill-opacity', d => {
          if (localDijkstraMode && activeSourceId) {
            return distances.has(d.id) ? 1 : 0.1
          }
          return 1
        })
        .attr('stroke', d => d.id === localSelectedId ? '#000' : '#fff')
        .attr('stroke-width', d => d.id === localSelectedId ? 3 : 2)

      nodes.exit().remove()
    }
  }

  function resize() {
    const w = getW(),
      h = getH()
    if (simulation) {
      simulation.force('center', d3.forceCenter(w / 2, h / 2))
      simulation.force('x', d3.forceX(w / 2).strength(0.05))
      simulation.force('y', d3.forceY(h / 2).strength(0.05))
      simulation.alpha(0.3).restart()
    }
  }

  const resizeObserver = new ResizeObserver(() =>
    requestAnimationFrame(resize),
  )
  if (svgEl.parentElement) resizeObserver.observe(svgEl.parentElement)

  function resetView() {
    if (localPapers.length === 0) {
      svg.call(zoomBehavior.transform, d3.zoomIdentity)
      return
    }

    // Get bounding box of all nodes
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity
    localPapers.forEach((d: any) => {
      const x = d.x || 0
      const y = d.y || 0
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    })

    if (x0 === Infinity || x1 - x0 < 10) {
      svg.call(zoomBehavior.transform, d3.zoomIdentity)
      return
    }

    const w = x1 - x0,
      h = y1 - y0
    const cw = getW(),
      ch = getH()
    const padding = 60

    const scale = Math.min(
      cw / (w + padding * 2),
      ch / (h + padding * 2),
      1,
    )
    const tx = cw / 2 - ((x0 + x1) / 2) * scale
    const ty = ch / 2 - ((y0 + y1) / 2) * scale

    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale),
    )
  }

  function unmount() {
    resizeObserver.disconnect()
    if (simulation) simulation.stop()
    svg.selectAll('*').remove()
  }

  return { update, unmount, resetView }
}
