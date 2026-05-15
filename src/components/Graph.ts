import type { Paper, Connection } from '../types'
import { TimelineGraph } from './TimelineGraph'
import { NetworkGraph } from './NetworkGraph'

export interface GraphOptions {
  onPaperClick: (paper: Paper, ev: MouseEvent) => void
  onHover: (paper: Paper, ev: MouseEvent) => void
  onHoverLeave: () => void
}

export function Graph(
  svgEl: SVGSVGElement,
  options: GraphOptions,
) {
  let currentMode: 'coords' | 'force' | null = null
  let activeGraph: any = null
  let isFirstUpdate = false

  function update(
    papers: Paper[],
    connections: Connection[],
    selectedId: string | null,
    hoveredId: string | null,
    dijkstraMode: boolean,
    graphMode: 'coords' | 'force',
  ) {
    if (currentMode !== graphMode) {
      if (activeGraph) {
        activeGraph.unmount()
      }
      
      currentMode = graphMode
      
      if (graphMode === 'coords') {
        activeGraph = TimelineGraph(svgEl, options)
      } else {
        activeGraph = NetworkGraph(svgEl, options)
      }
      isFirstUpdate = true
    }

    if (activeGraph) {
      activeGraph.update(
        papers,
        connections,
        selectedId,
        hoveredId,
        dijkstraMode,
      )

      if (isFirstUpdate) {
        if (activeGraph.resetView) {
          activeGraph.resetView()
        }
        isFirstUpdate = false
      }
    }
  }

  function resetView() {
    if (activeGraph?.resetView) {
      activeGraph.resetView()
    }
  }

  function unmount() {
    if (activeGraph) {
      activeGraph.unmount()
    }
  }

  return { update, unmount, resetView }
}
