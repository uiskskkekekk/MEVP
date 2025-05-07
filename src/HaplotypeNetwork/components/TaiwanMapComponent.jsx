import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";

//
// 判斷 PieChart 是否需要重新渲染（提升效能）
//
const areEqual = (prevProps, nextProps) => {
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.chartData.totalCount !== nextProps.chartData.totalCount) return false;

  const prevData = prevProps.chartData.data;
  const nextData = nextProps.chartData.data;

  if (prevData.length !== nextData.length) return false;

  for (let i = 0; i < prevData.length; i++) {
    if (prevData[i].name !== nextData[i].name || prevData[i].value !== nextData[i].value) {
      return false;
    }
  }

  return true;
};

//
// 單一城市圓餅圖元件（已記憶化）
//
const CityPieChart = memo(({ city, chartData, geneColors, position }) => {
  const { data, totalCount } = chartData;
  const outerRadius = Math.min(10 + Math.floor(totalCount / 10) * 10, 50);

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

//
// 台灣地圖主元件
//
const TaiwanMapComponent = ({ genes, cityGeneData, geneColors }) => {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);

  const genesPerPage = 100;

  // 所有基因名稱列表
  const allGenes = useMemo(() => genes.map((g) => g.name), [genes]);

  // 初始設定選取全部基因
  useEffect(() => {
    setSelectedGenes(allGenes);
  }, [allGenes]);

  // 搜尋過濾後的基因清單
  const filteredGeneList = useMemo(() => {
    return allGenes.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allGenes, searchTerm]);

  // 當前頁面的基因清單
  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );
  const totalPages = Math.ceil(filteredGeneList.length / genesPerPage);

  // 切換基因選取狀態
  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  // 全選與清除
  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  // 根據選取基因過濾城市資料
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

  // 滑鼠移動時更新經緯度顯示
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
      {/* 台灣地圖區塊 */}
      <div
        style={{ position: "relative", width: `400px`, height: `600px` }}
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
        {/* 經緯度顯示 */}
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

      {/* 基因選擇區塊 */}
      <div style={{ display: "flex", flexDirection: "column", width: "700px", height: "100%" }}>
        {/* 搜尋與操作欄位 */}
        <div style={{ flexShrink: 0 }}>
          <h4>選擇顯示基因：</h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋基因名稱"
            style={{ width: "95%", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
            <button onClick={handleSelectAll}>全選</button>
            <button onClick={handleClearAll}>清除選擇</button>
          </div>
        </div>

        {/* 基因勾選清單（可捲動） */}
        <div
          style={{
            overflowY: "auto",
            maxHeight: "480px",
            flexGrow: 1,
            paddingRight: "8px",
            borderTop: "1px solid #ccc",
            borderBottom: "1px solid #ccc",
            marginBottom: "8px",
          }}
        >
          {currentGenes.map((name) => (
            <label
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 0",
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

        {/* 分頁控制 */}
        <div
          style={{
            flexShrink: 0,
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
