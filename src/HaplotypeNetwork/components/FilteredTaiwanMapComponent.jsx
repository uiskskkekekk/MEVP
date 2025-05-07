import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";

// --- PieChart 優化渲染：只在需要時更新 ---
const areEqual = (prevProps, nextProps) => {
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.chartData.totalCount !== nextProps.chartData.totalCount) return false;

  const prevData = prevProps.chartData.data;
  const nextData = nextProps.chartData.data;
  if (prevData.length !== nextData.length) return false;

  for (let i = 0; i < prevData.length; i++) {
    if (
      prevData[i].name !== nextData[i].name ||
      prevData[i].value !== nextData[i].value
    ) {
      return false;
    }
  }

  return true;
};

// --- 單一城市圓形圖元件 ---
const CityPieChart = memo(({ city, chartData, geneColors, position }) => {
  const { data, totalCount } = chartData;
  const outerRadius = Math.min(10 + Math.floor(totalCount / 10) * 10, 50); // 動態半徑設定

  return (
    <div
      style={{
        position: "absolute",
        left: `${position.cx}px`,
        top: `${position.cy}px`,
        transform: "translate(-50%, -50%)",
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
}, areEqual);

// --- 主元件：台灣地圖與基因圓圖選擇 ---
const FilteredTaiwanMapComponent = ({
  genes,
  cityGeneData,
  geneColors,
  selectedGene,
  activeSimilarityGroup,
}) => {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });         // 經緯度顯示
  const [searchTerm, setSearchTerm] = useState("");                 // 搜尋欄文字
  const [currentPage, setCurrentPage] = useState(0);                // 分頁頁碼
  const [selectedGenes, setSelectedGenes] = useState([]);           // 被選取的基因
  const genesPerPage = 100;                                         // 每頁顯示基因數

  const allGenes = useMemo(() => genes.map((g) => g.name), [genes]);

  // --- 根據主選基因與相似群組，自動設定選取基因 ---
  useEffect(() => {
    const allowed = new Set([
      selectedGene,
      ...(Array.isArray(activeSimilarityGroup) ? activeSimilarityGroup : []),
    ]);
    setSelectedGenes(Array.from(allowed).filter(Boolean));
  }, [selectedGene, activeSimilarityGroup]);

  // --- 基因過濾 + 搜尋邏輯 ---
  const filteredGeneList = useMemo(() => {
    return allGenes.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allGenes, searchTerm]);

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );
  const totalPages = Math.ceil(filteredGeneList.length / genesPerPage);

  // --- 切換單一基因選取狀態 ---
  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  // --- 根據已選基因，計算各縣市的圓圖資料 ---
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

  // --- 滑鼠移動計算經緯度 ---
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lon = 120.0 + (x / 400) * (122.0 - 120.0);
    const lat = 25.0 - (y / 600) * (25.0 - 22.0);
    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {/* --- 地圖區 --- */}
      <div
        style={{ position: "relative", width: "400px", height: "600px" }}
        onMouseMove={handleMouseMove}
      >
        <img src={TaiwanMapImage} alt="Taiwan Map" width={400} height={600} />
        {Object.entries(filteredCityGeneData).map(([city, chartData]) => (
          <CityPieChart
            key={city}
            city={city}
            chartData={chartData}
            geneColors={geneColors}
            position={cityCoordinates[city]}
          />
        ))}
        {/* 經緯度顯示標籤 */}
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            left: "5px",
            backgroundColor: "rgba(236, 15, 15, 0.85)",
            padding: "4px 8px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          經度: {latLon.lon}°E<br />
          緯度: {latLon.lat}°N
        </div>
      </div>

      {/* --- 基因選單區 --- */}
      <div style={{ display: "flex", flexDirection: "column", width: "700px" }}>
        {/* 搜尋與操作區塊 */}
        <div style={{ marginBottom: "8px" }}>
          <h4>選擇顯示基因：</h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋基因名稱"
            style={{ width: "95%", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", gap: "5px" }}>
            <button onClick={handleSelectAll}>全選</button>
            <button onClick={handleClearAll}>清除選擇</button>
          </div>
        </div>

        {/* 基因勾選清單區 */}
        <div style={{ flex: 1, overflowY: "auto", maxHeight: "460px", paddingRight: "5px" }}>
          {currentGenes.map((name) => {
            const isEnabled =
              name === selectedGene ||
              (Array.isArray(activeSimilarityGroup) && activeSimilarityGroup.includes(name));
            return (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: isEnabled ? 1 : 0.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedGenes.includes(name)}
                  onChange={() => toggleGene(name)}
                  disabled={!isEnabled}
                />
                <span style={{ color: geneColors[name] || "black" }}>{name}</span>
              </label>
            );
          })}
        </div>

        {/* 分頁控制區塊 */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            上一頁
          </button>
          <span>第 {currentPage + 1} 頁 / 共 {totalPages} 頁</span>
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

export default FilteredTaiwanMapComponent;
