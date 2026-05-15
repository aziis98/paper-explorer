# Paper Explorer

<img src="public/favicon.svg" width="64" align="left" style="margin-right: 16px;" />

A powerful, high-performance research paper exploration tool. Visualize citation networks, discover related work, and map out the academic landscape through interactive timelines and physics-based graphs.

<br>

![Screenshot](docs/screenshot-2.png)

## Features

- **Dual Visualization Engines**:
    - **Timeline Mode**: Map papers chronologically with citation counts on a symmetric logarithmic vertical scale.
    - **Network Mode**: Explore deep connections with a physics-based, force-directed graph featuring 2D pan and zoom.
- **Shortest Path Analysis**: Integrated Dijkstra-based pathfinding to visualize the citation bridges between distant papers with non-linear color decay.
- **Advanced Discovery**: Instant search and expansion of references or citations via the Semantic Scholar and OpenAlex APIs.
- **Project Management**: Support for multiple concurrent research projects with automatic persistent storage.
- **Review & Import Workflow**:
    - Scrape DOIs from BibTeX files or raw text.
    - Review and edit paper metadata before importing to ensure data integrity.
    - Integrated resolution of failed DOI lookups.
- **Professional Export**: Generate clean, standardized BibTeX files compatible with Zotero, Mendeley, and LaTeX.
- **Premium UI/UX**:
    - "Linguette" sidebar toggles for a clean, maximized workspace.
    - Responsive, auto-reflowing SVG canvases that adapt to sidebar and window state.
    - Modern typography and curated monochrome aesthetics.
- **Direct Access**: Quick links to ArXiv PDFs and publisher pages integrated directly into the sidebar.

## Getting Started

This project is built with **Vite**, **TypeScript**, and **D3.js**.

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/)

### Installation

```bash
# Clone the repository
git clone https://github.com/aziis98/paper-explorer.git
cd paper-explorer

# Install dependencies
bun install
```

### Development

```bash
bun dev
```

### Build

```bash
bun run build
```

## Built With

- **[D3.js](https://d3js.org/)** - For advanced graph and physics visualizations.
- **[Semantic Scholar API](https://www.semanticscholar.org/product/api)** - For high-quality academic metadata and citations.
- **[OpenAlex API](https://openalex.org/)** - For comprehensive global research mapping.
- **[TypeScript](https://www.typescriptlang.org/)** - For a robust, type-safe codebase.
- **[Vite](https://vitejs.dev/)** - For a lightning-fast modern build pipeline.
