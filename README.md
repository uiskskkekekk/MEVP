# MEVP

A molecular evolution visualization platform

## Development

### Install

```
git clone https://github.com/uiskskkekekk/MEVP
cd MEVP
yarn (or npm install)
```

### Develop

yarn：

```
yarn dev
```

npm：

```
npm run dev
```

### Backend Develop

yarn：

```
cd server
yarn dev
```

npm：

```
cd server
npm run dev
```

### Directory structure

```
.
├── README.md
├── index.html
├── package.json
├── src
│   ├── App.css
│   ├── App.jsx
│   ├── HaplotypeNetwork
│   │   ├── HaplotypeNetworkApp.jsx
│   │   ├── components
│   │   │   ├── FilteredTaiwanMapComponent.jsx
│   │   │   ├── GeneSelector.jsx
│   │   │   ├── GeneTable.jsx
│   │   │   ├── HaplotypeList.jsx
│   │   │   └── TaiwanMapComponent.jsx
│   │   ├── data
│   │   │   └── cityCoordinates.js
│   │   └── workers
│   │       ├── chartWorker.js
│   │       ├── compareWorker.js
│   │       └── fileWorker.js
│   ├── Phylotree
│   │   ├── components
│   │   │   ├── PhylotreeApplication.jsx
│   │   │   └── phylotree
│   │   │       ├── BranchLengthAxis.jsx
│   │   │       ├── ContextMenu.jsx
│   │   │       ├── InternalNode.jsx
│   │   │       ├── NodeLabel.jsx
│   │   │       ├── branch.jsx
│   │   │       ├── phylotree.jsx
│   │   │       └── tooltip_container.jsx
│   │   ├── styles
│   │   │   └── phylotree.css
│   │   └── utils
│   │       ├── text_width.js
│   │       └── tree-utils.js
│   ├── assets
│   │   ├── haplotype
│   │   │   └── TW.png
│   │   └── phylotree
│   └── main.jsx
└── vite.config.js
```
