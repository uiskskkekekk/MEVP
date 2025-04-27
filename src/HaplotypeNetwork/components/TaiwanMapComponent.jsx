import React, { memo, useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";

const areEqual = (prevProps, nextProps) => {
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.chartData.totalCount !== nextProps.chartData.totalCount)
    return false;

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
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${city}-${index}`} fill={geneColors[entry.name]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
}, areEqual);

const TaiwanMapComponent = ({ genes, geneColors }) => {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [selectedGenes, setSelectedGenes] = useState(() =>
    genes.map((g) => g.name)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const genesPerPage = 500;
  const totalPages = Math.ceil(genes.length / genesPerPage);

  const filteredGeneList = useMemo(() => {
    return genes.filter((g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genes, searchTerm]);

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lon = 120.0 + (x / 400) * (122.0 - 120.0);
    const lat = 25.0 - (y / 600) * (25.0 - 22.0);

    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  };

  const memoizedChartData = useMemo(() => {
    const result = {};
    for (const city of Object.keys(cityCoordinates)) {
      const data = genes
        .filter((g) => selectedGenes.includes(g.name))
        .map((gene) => ({
          name: gene.name,
          value: gene.counts?.[city] || 0,
        }))
        .filter((item) => item.value > 0);

      if (data.length > 0) {
        const totalCount = data.reduce((sum, item) => sum + item.value, 0);
        result[city] = { data, totalCount };
      }
    }
    return result;
  }, [genes, selectedGenes]);

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    setSelectedGenes(filteredGeneList.map((g) => g.name));
  };

  const handleClearAll = () => {
    setSelectedGenes([]);
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {/* 地圖區域 */}
      <div
        style={{ position: "relative", width: `400px`, height: `600px` }}
        onMouseMove={handleMouseMove}
      >
        <img src={TaiwanMapImage} alt="Taiwan Map" width={400} height={600} />
        {Object.entries(memoizedChartData).map(([city, chartData]) => (
          <CityPieChart
            key={city}
            city={city}
            chartData={chartData}
            geneColors={geneColors}
            position={cityCoordinates[city]}
          />
        ))}
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            left: "5px",
            backgroundColor: "rgba(248, 7, 7, 0.85)",
            padding: "4px 8px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          經度: {latLon.lon}°E
          <br />
          緯度: {latLon.lat}°N
        </div>
      </div>

      {/* 控制勾選表單 */}
      <div style={{ maxHeight: "600px", overflowY: "auto", width: "260px" }}>
        <h4>選擇顯示基因：</h4>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋基因名稱"
          style={{ width: "100%", marginBottom: "8px" }}
        />
        <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
          <button onClick={handleSelectAll}>全選</button>
          <button onClick={handleClearAll}>清除選擇</button>
        </div>
        {currentGenes.map((gene) => (
          <label
            key={gene.name}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <input
              type="checkbox"
              checked={selectedGenes.includes(gene.name)}
              onChange={() => toggleGene(gene.name)}
            />
            <span style={{ color: geneColors[gene.name] || "black" }}>
              {gene.name}
            </span>
          </label>
        ))}
        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
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
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
            }
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
