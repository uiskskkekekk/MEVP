# MEVP — Molecular Evolution Visualization Platform

A full‑stack platform for interactive visualization and analysis of molecular evolution data. MEVP contains interactive phylogenetic tree visualizations, haplotype networks with geographic overlays, sequence alignment/editing tools, and backend services for sequence comparison and processing.

## Highlights

- Interactive phylogenetic tree visualization (Newick import/export, dynamic rerooting, node annotation).
- Haplotype network with geographic map overlays and haplotype reduction tools.
- Sequence alignment and editing UI.
- Node.js/Express backend APIs and Python utilities for sequence processing.
- Optional LLM integration for natural language assistance (server/controllers/llmController.js).

## Quick facts

- Frontend: React + Vite (ESM)
- Visualization: D3 (used in phylogenetic tree modules) and custom React components
- Backend: Node.js + Express
- Utility scripts: Python 3 (haplotype reduction helper)

## Repository layout

- `src/` — React frontend source
  - `src/Phylotree/` — tree UI, utilities, export services
  - `src/HaplotypeNetwork/` — haplotype UI, map data, local compare service, haplotype reduction helpers
  - `src/Sequence alignment/` — sequence alignment application
  - `src/assets/` — images and static assets (maps, icons)
  - `src/commands/` — command registry and executor used by the UI
- `server/` — Express API (controllers, routes, config)
- `src/HaplotypeNetwork/Additional/` — Python helper scripts such as `reduce_hap_size_py3.py`
- `vite.config.js` — Vite config and proxy setup
- `package.json` (root & server/) — project and server dependencies and scripts

## Prerequisites

- Node.js (recommended >= 18)
- npm or yarn
- Python 3 (for running the haplotype reduction script)
- (Optional) Ollama or other LLM runtime if you use the LLM features

## Development (quick start)

From project root:

1. Install root dependencies

```bash
npm install
# or
# yarn
```

2. Start the frontend dev server

```bash
npm run dev
# or
# yarn dev
```

3. Start the backend API (separate terminal)

```bash
cd server
npm install
node server.js
# or (recommended for development)
# npx nodemon server.js
```

4. Optional: run Python helper

```bash
python3 src/HaplotypeNetwork/Additional/reduce_hap_size_py3.py --help
```

## Common tasks

- Build production frontend: `npm run build`
- Run unit tests: (no tests included by default — add a testing framework and scripts)
- Linting: (configure ESLint/Prettier if desired)

## Notes for contributors / maintainers

- Check `vite.config.js` for API proxy settings. During development, Vite proxies backend requests to the Express server.
- The haplotype compare microservice is under `src/HaplotypeNetwork/gene-compare-backend/` and can be started independently if you want to isolate heavy sequence processing.
- Newick import/export and tree rerooting logic live in `src/Phylotree/` alongside `TreeUtils.js` and `MoveToRootUtils.js` — these are good places to add algorithms or improve performance.
- Add unit tests around core data transformations (Newick parsing, tree traversal, haplotype reduction) to prevent regressions when refactoring visualizations.

## Suggested next improvements

- Add automated tests (Jest/Testing Library) for key modules.
- Add CI (GitHub Actions) to run lint/build/tests on PRs.
- Add a `Makefile` or root `scripts` to simplify common workflows (start-dev, start-server, lint, test).
- Add example datasets and a `data/` readme describing accepted formats (FASTA, Newick, CSV metadata).

## License & contact

- Add your preferred license to the repository root (e.g., `LICENSE` file).
- Maintainer: (add name and contact email)
