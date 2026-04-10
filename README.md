# 📄 Paper Explorer

A minimal, high-performance research paper exploration tool. Visualize citation graphs, discover references, and navigate the academic landscape with ease.

![Paper Explorer Favicon](public/favicon.svg)

## ✨ Features

- **Interactive Citation Graph**: Visualize the relationships between papers across a timeline with citation counts on a log scale.
- **Smart Focus**: Hover over any paper to highlight its direct connectivity and dim the noise.
- **Real-time Discovery**: Instant search via OpenAlex API with support for references and citation expansion.
- **ArXiv Integration**: Direct links to ArXiv PDFs and landing pages whenever available.
- **Efficient Workflow**: Manage your exploration by promoting secondary discoveries to your main workspace.
- **Modern Aesthetics**: A clean, neo-brutalist inspired UI with a focus on typography and clear data hierarchy.

## 🚀 Getting Started

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

## 🛠️ Built With

- **[D3.js](https://d3js.org/)** - For the interactive graph visualization.
- **[OpenAlex API](https://openalex.org/)** - For comprehensive academic metadata.
- **[TypeScript](https://www.typescriptlang.org/)** - For type-safe development.
- **[Vite](https://vitejs.dev/)** - For a lightning-fast build pipeline.

## ⚖️ License

MIT
