import * as d3 from 'd3'

export const CONFIG = {
  GRAPH: {
    DIJKSTRA_COLOR_START: '#0369a1',
    DIJKSTRA_COLOR_END: '#e0f2fe',
    DIJKSTRA_INTERPOLATOR: (t: number) => {
      // Quadratic/Exponential-like decay for the gradient
      // t is normalized distance [0, 1]
      // We use a power function to make the transition non-linear
      const easedT = Math.pow(t, 0.65) 
      return d3.interpolateRgb('#0369a1', '#e0f2fe')(easedT)
    },
    EDGE_COLOR_DEFAULT: '#94a3b8',
    NODE_COLOR_SECONDARY: '#94a3b8',
    NODE_COLOR_DEFAULT: '#3b82f6',
  }
}
