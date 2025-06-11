// TaiwanMapComponent.jsx
// 顯示台灣地圖 + 每個城市圓餅圖 + 基因勾選控制器 + 匯出圖與基因列表（右側圖例多欄，每欄30筆）

import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";
import { cityCoordinates2 } from "../data/cityCoordinates2";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import "../components/AppStyles.css";

const CityPieChart = memo(
  ({ city, chartData, geneColors, position, opacity }) => {
    const { data, totalCount } = chartData;
    const outerRadius = Math.min(5 + Math.floor(totalCount / 5) * 5, 25);

    return (
      <div
        className="city-pie-chart"
        style={{ left: `${position.cx}px`, top: `${position.cy}px`, opacity }}
      >
        <PieChart width={outerRadius * 2} height={outerRadius * 2}>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={outerRadius}>
            {data.map((entry, index) => (
              <Cell key={`cell-${city}-${index}`} fill={geneColors[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
    );
  },
  (prev, next) =>
    prev.city === next.city &&
    prev.opacity === next.opacity &&
    prev.chartData.totalCount === next.chartData.totalCount &&
    prev.chartData.data.length === next.chartData.data.length &&
    prev.chartData.data.every(
      (d, i) =>
        d.name === next.chartData.data[i].name &&
        d.value === next.chartData.data[i].value
    )
);

const TaiwanMapComponent = ({ genes, cityGeneData, geneColors, onSelectedGenesChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [cityVisibility, setCityVisibility] = useState(() => {
    const result = {};
    Object.keys(cityCoordinates).forEach((city) => (result[city] = true));
    return result;
  });

  const genesPerPage = 100;
  const allGenes = useMemo(() => genes.map((g) => g.name), [genes]);

  useEffect(() => {
    if (allGenes.length > 0 && !initialized) {
      setSelectedGenes(allGenes);
      setInitialized(true);
    }
  }, [allGenes, initialized]);

  useEffect(() => {
    onSelectedGenesChange?.(selectedGenes);
  }, [selectedGenes]);

  const filteredGeneList = useMemo(
    () => allGenes.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allGenes, searchTerm]
  );

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );

  const totalPages = Math.ceil(filteredGeneList.length / genesPerPage);

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  const filteredCityGeneData = useMemo(() => {
    const result = {};
    for (const [city, genes] of Object.entries(cityGeneData)) {
      if (!Array.isArray(genes)) continue;
      const data = genes.filter((g) => selectedGenes.includes(g.name));
      if (data.length > 0) {
        const totalCount = data.reduce((sum, g) => sum + g.value, 0);
        result[city] = { data, totalCount };
      }
    }
    return result;
  }, [cityGeneData, selectedGenes]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lon = 120.0 + (x / 400) * 2;
    const lat = 25.0 - (y / 600) * 3;
    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  };

  const handleExportPNG = async () => {
    const mapContainer = document.getElementById("map-container");
    if (!mapContainer) return;

    const mapCanvas = await html2canvas(mapContainer);

    const padding = 10;
    const fontSize = 16;
    const boxSize = 14;
    const spacing = 6;
    const font = `${fontSize}px sans-serif`;
    const itemsPerColumn = 30;
    const legendItems = selectedGenes.map((name) => ({ name, color: geneColors[name] || "#000000" }));

    const numCols = Math.ceil(legendItems.length / itemsPerColumn);
    const legendWidth = 180 * numCols;
    const legendHeight = padding * 2 + itemsPerColumn * (fontSize + spacing);

    const canvas = document.createElement("canvas");
    canvas.width = mapCanvas.width + legendWidth;
    canvas.height = Math.max(mapCanvas.height, legendHeight);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapCanvas, 0, 0);

    ctx.font = font;
    ctx.textBaseline = "middle";

    legendItems.forEach((item, i) => {
      const col = Math.floor(i / itemsPerColumn);
      const row = i % itemsPerColumn;
      const x = mapCanvas.width + col * 180 + padding;
      const y = padding + row * (fontSize + spacing) + fontSize / 2;

      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x + boxSize / 2, y, boxSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.fillText(item.name, x + boxSize + 8, y);
    });

    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, "taiwan-map-with-haplotype-list.png");
    });
  };

  return (
    <div className="flex flex-gap-10">
      {/* 地圖區塊 */}
      <div id="map-container" className="map-container" onMouseMove={handleMouseMove}>
        <img src={TaiwanMapImage} alt="Taiwan Map" width={400} height={600} />
        <svg width={400} height={600} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="gray" />
            </marker>
          </defs>
          {Object.entries(filteredCityGeneData).map(([city, chartData]) => {
            const outerRadius = Math.min(10 + Math.floor(chartData.totalCount / 10) * 10, 50);
            const threshold = 20;
            const from = cityCoordinates[city];
            const to = (outerRadius > threshold ? cityCoordinates2[city] : cityCoordinates[city]) || from;
            if (from && to && (from.cx !== to.cx || from.cy !== to.cy)) {
              return (
                <line
                  key={`line-${city}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke="gray"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  markerEnd="url(#arrow)"
                />
              );
            }
            return null;
          })}
        </svg>

        {Object.entries(filteredCityGeneData).map(([city, chartData]) => {
          const outerRadius = Math.min(10 + Math.floor(chartData.totalCount / 10) * 10, 50);
          const threshold = 20;
          const coordinates = outerRadius > threshold ? cityCoordinates2[city] || cityCoordinates[city] : cityCoordinates[city];
          return (
            <CityPieChart
              key={city}
              city={city}
              chartData={chartData}
              geneColors={geneColors}
              position={coordinates}
              opacity={cityVisibility[city] ? 1 : 0.1}
            />
          );
        })}

        <div className="coord-label">
          經度: {latLon.lon}°E<br />
          緯度: {latLon.lat}°N
        </div>
      </div>

      {/* 控制面板區 */}
      <div className="flex flex-row flex-gap-10">
        <div className="gene-control-panel">
          <h4>選擇顯示基因：</h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋基因名稱"
            className="search-input"
          />
          <div className="button-group">
            <button onClick={handleSelectAll}>全選</button>
            <button onClick={handleClearAll}>清除</button>
            <span style={{ marginLeft: "auto" }}>
              已選 {selectedGenes.length} / {allGenes.length}
            </span>
          </div>
          <div className="scroll-y" style={{ maxHeight: 400, border: "1px solid #ccc" }}>
            {currentGenes.map((name) => (
              <label key={name} className="gene-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGenes.includes(name)}
                  onChange={() => toggleGene(name)}
                />
                <span style={{ color: geneColors[name] || "black" }}>{name}</span>
              </label>
            ))}
          </div>
          <div className="pagination-controls">
            <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
              上一頁
            </button>
            <span>
              第 {currentPage + 1} 頁 / 共 {totalPages} 頁
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
              下一頁
            </button>
          </div>
        </div>

        <div className="city-visibility-control">
          <h4>城市顯示控制：</h4>
          <div className="scroll-y" style={{ maxHeight: 500 }}>
            {Object.keys(cityCoordinates).map((city) => (
              <label key={city} style={{ display: "block", marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={cityVisibility[city]}
                  onChange={() => setCityVisibility((prev) => ({ ...prev, [city]: !prev[city] }))}
                /> {city}
              </label>
            ))}
          </div>
          <button onClick={handleExportPNG} style={{ marginTop: 10 }}>
            匯出地圖 PNG + Haplotype 圖例
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaiwanMapComponent;