import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";
import { cityCoordinates2 } from "../data/cityCoordinates2";

// --------------------------------------------
// 記憶化元件：城市圓餅圖（避免不必要重繪）
// --------------------------------------------
const CityPieChart = memo(
  ({ city, chartData, geneColors, position }) => {
    const { data, totalCount } = chartData;
    // 動態設定圓餅圖半徑，最大50
    const outerRadius = Math.min(10 + Math.floor(totalCount / 10) * 10, 50);

    return (
      <div
        style={{
          position: "absolute",
          left: `${position.cx}px`,
          top: `${position.cy}px`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none", // 避免圓餅圖攔截滑鼠事件
        }}
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
    prev.chartData.totalCount === next.chartData.totalCount &&
    prev.chartData.data.length === next.chartData.data.length &&
    prev.chartData.data.every(
      (d, i) => d.name === next.chartData.data[i].name && d.value === next.chartData.data[i].value
    )
);

// --------------------------------------------
// 主組件：台灣地圖 + 基因列表與選擇控制
// --------------------------------------------
const TaiwanMapComponent = ({
  genes,
  cityGeneData,
  geneColors,
  onSelectedGenesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [initialized, setInitialized] = useState(false);
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
  }, [selectedGenes, onSelectedGenesChange]);

  const filteredGeneList = useMemo(() => {
    return allGenes.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allGenes, searchTerm]);

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

  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lon = 120.0 + (x / 400) * 2;
    const lat = 25.0 - (y / 600) * 3;
    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  };

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {/* 台灣地圖區 */}
      <div
        style={{ position: "relative", width: 400, height: 600, userSelect: "none" }}
        onMouseMove={handleMouseMove}
      >
        <img src={TaiwanMapImage} alt="Taiwan Map" width={400} height={600} />
        {Object.entries(filteredCityGeneData).map(([city, chartData]) => {
          const outerRadius = Math.min(10 + Math.floor(chartData.totalCount / 10) * 10, 50);
          const threshold = 20;
          const coordinates =
            outerRadius > threshold
              ? cityCoordinates2[city] || cityCoordinates[city]
              : cityCoordinates[city];
          return (
            <CityPieChart
              key={city}
              city={city}
              chartData={chartData}
              geneColors={geneColors}
              position={coordinates}
            />
          );
        })}

        {/* 經緯度顯示 */}
        <div
          style={{
            position: "absolute",
            bottom: 5,
            left: 5,
            backgroundColor: "rgba(236, 15, 15, 0.85)",
            padding: "4px 8px",
            borderRadius: 5,
            fontSize: 12,
            fontFamily: "monospace",
            color: "white",
            userSelect: "none",
          }}
        >
          經度: {latLon.lon}°E
          <br />
          緯度: {latLon.lat}°N
        </div>
      </div>

      {/* 基因選擇區 */}
      <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
        <h4>選擇顯示基因：</h4>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋基因名稱"
          style={{ width: "95%", marginBottom: 8, padding: 4 }}
        />
        <div style={{ marginBottom: 8, display: "flex", gap: 5, alignItems: "center" }}>
          <button onClick={handleSelectAll}>全選</button>
          <button onClick={handleClearAll}>清除選擇</button>
          <span style={{ marginLeft: "auto", fontStyle: "italic" }}>
            已選 {selectedGenes.length} / {allGenes.length}
          </span>
        </div>
        <div
          style={{
            overflowY: "auto",
            maxHeight: 480,
            paddingRight: 8,
            borderTop: "1px solid #ccc",
            borderBottom: "1px solid #ccc",
            marginBottom: 8,
          }}
        >
          {currentGenes.map((name) => (
            <label
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={selectedGenes.includes(name)}
                onChange={() => toggleGene(name)}
              />
              <span style={{ color: geneColors[name] || "black" }}>{name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            上一頁
          </button>
          <span>
            第 {currentPage + 1} 頁 / 共 {totalPages} 頁
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaiwanMapComponent;
