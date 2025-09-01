import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { mapImages } from "../data/mapImages";
import { generateCityCoordinates } from "../data/cityCoordinates3";
import "../components/AppStyles.css";

// ---------- 子元件：城市圓餅圖 ----------
const CityPieChart = memo(
  ({ city, chartData, geneColors, position, opacity }) => {
    if (!position || typeof position.cx !== "number" || typeof position.cy !== "number")
      return null;

    const { data, totalCount } = chartData;
    const outerRadius = Math.min(5 + Math.floor(totalCount / 5) * 5, 25);

    return (
      <div
        className="city-pie-chart"
        style={{
          position: "absolute",
          left: `${position.cx}px`,
          top: `${position.cy}px`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "auto",
          opacity,
          zIndex: 20,
        }}
      >
        <PieChart width={outerRadius * 2} height={outerRadius * 2}>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={outerRadius}>
            {data.map((entry, index) => (
              <Cell key={`cell-${city}-${index}`} fill={geneColors[entry.name] || "#bbb"} />
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
    JSON.stringify(prev.chartData.data) === JSON.stringify(next.chartData.data) &&
    prev.position?.cx === next.position?.cx &&
    prev.position?.cy === next.position?.cy
);

// ---------- 主元件 ----------
const FilteredTaiwanMapComponent = ({
  genes,
  cityGeneData,
  geneColors,
  selectedGene,
  activeSimilarityGroup,
  onSelectedGenesChange,

  onMapSettingsChange,   // 👈 新增


}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const genesPerPage = 50;

  // --- 地圖設定 ---
  const [activeMapId, setActiveMapId] = useState(null);
  const [mapImage, setMapImage] = useState(null);
  const [imgW, setImgW] = useState(null);
  const [imgH, setImgH] = useState(null);
  const [lonRange, setLonRange] = useState([null, null]);
  const [latRange, setLatRange] = useState([null, null]);

 const [mapUrl, setMapUrl] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);


// --- 當地圖設定改變時，通知父層 ---
  useEffect(() => {
    if (imgW && imgH && lonRange[0] !== null && latRange[0] !== null) {
      onMapSettingsChange?.({ imgW, imgH, lonRange, latRange });
    }
  }, [imgW, imgH, lonRange, latRange, onMapSettingsChange]);


  




  const conW = imgW + 300;
  const conH = imgH + 300;

  // 外部可用的座標區域
  const [cityCoordinates3, setCityCoordinates3] = useState([]);
  useEffect(() => {
    setCityCoordinates3(generateCityCoordinates(imgW, imgH, 200, 75));
  }, [imgW, imgH]);

  // 初始化 selectedGenes
  const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);
  useEffect(() => {
    const allowed = new Set([
      selectedGene,
      ...(Array.isArray(activeSimilarityGroup) ? activeSimilarityGroup : []),
    ]);
    setSelectedGenes(Array.from(allowed).filter(Boolean));
  }, [selectedGene, activeSimilarityGroup]);

  useEffect(() => {
    onSelectedGenesChange?.(selectedGenes);
  }, [selectedGenes, onSelectedGenesChange]);

  const filteredGeneList = useMemo(
    () => allGenes.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allGenes, searchTerm]
  );

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );
  const totalPages = Math.max(1, Math.ceil(filteredGeneList.length / genesPerPage));

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  // ---------- 地圖切換 ----------
  const handleSwitchMap = (map) => {
    if (map.id === "Customize") {
      setActiveMapId("Customize");
      setMapImage(null);
      return;
    }

    const img = new Image();
    img.src = map.src;
    img.onload = () => {
      let newWidth = img.naturalWidth;
      let newHeight = img.naturalHeight;

      const maxSize = 1000;
      if (Math.max(newWidth, newHeight) > maxSize) {
        const scale = maxSize / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
      }

      setActiveMapId(map.id);
      setMapImage(map.src);
      setImgW(newWidth);
      setImgH(newHeight);
      setLonRange(map.defaultLonRange || [120, 122]);
      setLatRange(map.defaultLatRange || [21.5, 25.5]);
    };
  };

  // ---------- 上傳自訂地圖 ----------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let newWidth = img.naturalWidth;
        let newHeight = img.naturalHeight;

        const maxSize = 1000;
        if (Math.max(newWidth, newHeight) > maxSize) {
          const scale = maxSize / Math.max(newWidth, newHeight);
          newWidth = Math.round(newWidth * scale);
          newHeight = Math.round(newHeight * scale);
        }

         setActiveMapId(map.id);
        setMapImage(map.src);
        setImgW(newWidth);
        setImgH(newHeight);
        setLonRange(map.defaultLonRange);
        setLatRange(map.defaultLatRange);

        setMapLoaded(false);    // 切換時重置 loaded
      };
      img.src = url;
    }
  };

  // ---------- 坐標計算 ----------
  const offsetX = (conW - imgW) / 2;
  const offsetY = (conH - imgH) / 2;

  const adjustCoordinatesToContainer = (cx, cy) => {
    return { cx: cx + offsetX, cy: cy + offsetY };
  };

  const getNewCoordinates = (originalCoordinates, usedCoordinates) => {
    const { cx, cy } = originalCoordinates;
    let availableCoordinates = cityCoordinates3;

    const sortedAvailableCoordinates = availableCoordinates
      .map((coord) => ({ coord, distance: Math.hypot(cx - coord.cx, cy - coord.cy) }))
      .sort((a, b) => a.distance - b.distance);

    for (const { coord } of sortedAvailableCoordinates) {
      if (!usedCoordinates.some((u) => u.cx === coord.cx && u.cy === coord.cy)) {
        return coord;
      }
    }
    return originalCoordinates;
  };

  const filteredCityGeneData = useMemo(() => {
    if (!cityGeneData) return {};

    const usedCoordinates = [];
    return Object.entries(cityGeneData).reduce((acc, [city, content]) => {
      const genesList = (content.genes || []).filter((g) => selectedGenes.includes(g.name));
      if (!genesList || genesList.length === 0) return acc;

      const totalCount = genesList.reduce((sum, g) => sum + g.value, 0);
      const originalImgCoords = { cx: content.coordinates.cx, cy: content.coordinates.cy };
      const originalContainerCoords = adjustCoordinatesToContainer(originalImgCoords.cx, originalImgCoords.cy);

      let finalImgCoords = originalImgCoords;
      let line = null;

      if (totalCount < 10 || totalCount > 10) {
        const shiftedImg = getNewCoordinates(originalImgCoords, usedCoordinates);
        finalImgCoords = shiftedImg;
        line = {
          from: originalContainerCoords,
          to: adjustCoordinatesToContainer(finalImgCoords.cx, finalImgCoords.cy),
        };
      }

      const finalContainerCoords = adjustCoordinatesToContainer(finalImgCoords.cx, finalImgCoords.cy);
      usedCoordinates.push({ cx: finalImgCoords.cx, cy: finalImgCoords.cy });

      acc[city] = {
        data: genesList,
        totalCount,
        imgCoordinates: finalImgCoords,
        containerCoordinates: finalContainerCoords,
        originalContainerCoordinates: originalContainerCoords,
        line,
      };

      return acc;
    }, {});
  }, [cityGeneData, selectedGenes, imgW, imgH, lonRange, latRange]);

  // ---------- 經緯度 ----------
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top - offsetY;

    if (x >= 0 && x <= imgW && y >= 0 && y <= imgH) {
      const lon = lonRange[0] + (x / imgW) * (lonRange[1] - lonRange[0]);
      const lat = latRange[1] - (y / imgH) * (latRange[1] - latRange[0]);
      setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
    }
  };

  const decimalToDegreeMinute = (decimal) => {
    const deg = Math.floor(decimal);
    const min = Math.round((decimal - deg) * 60);
    return `${deg}°${min}′`;
  };

  return (
  <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
    {/* 左側：地圖清單 */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 500,
    alignSelf: "flex-start",
  }}
>
  {/* 上傳與調整區域 */}
  <label style={{ marginTop: 8 }}>Upload Map PNG:</label>
  <input type="file" accept="image/png" onChange={handleImageUpload} />

  <div style={{ marginTop: 8 }}>
    <label>Image Width:</label>
    <input
      type="number"
      value={imgW}
      onChange={(e) => setImgW(Number(e.target.value))}
      className="small-input"
    />
</div>
<div style={{ marginTop: 8 }}>
    <label> Image Height:</label>
    <input
      type="number"
      value={imgH}
      onChange={(e) => setImgH(Number(e.target.value))}
      className="small-input"
    />
    <button
      style={{ marginLeft: 8 }}
      onClick={() => {
        setImgW(Math.round(imgW * 1.25));
        setImgH(Math.round(imgH * 1.25));
      }}
    >
      🔍+
    </button>
    <button
      style={{ marginLeft: 4 }}
      onClick={() => {
        setImgW(Math.round(imgW * 0.8));
        setImgH(Math.round(imgH * 0.8));
      }}
    >
      🔍-
    </button>
  </div>

  <div>
    <label>Longitude Range:</label>
    <input
      type="number"
      value={lonRange[0]}
      onChange={(e) => setLonRange([+e.target.value, lonRange[1]])}
      className="small-input"
    />
    -
    <input
      type="number"
      value={lonRange[1]}
      onChange={(e) => setLonRange([lonRange[0], +e.target.value])}
      className="small-input"
    />
  </div>
  <div>
    <label>Latitude Range:</label>
    <input
      type="number"
      value={latRange[0]}
      onChange={(e) => setLatRange([+e.target.value, latRange[1]])}
      className="small-input"
    />
    -
    <input
      type="number"
      value={latRange[1]}
      onChange={(e) => setLatRange([latRange[0], +e.target.value])}
      className="small-input"
    />
  </div>

  {/* 地圖圖片切換按鈕區域 */}
  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
    {mapImages.map((map) => (
      <button
        key={map.id}
        onClick={() => handleSwitchMap(map)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: activeMapId === map.id ? "#4cafef" : "#f0f0f0",
          cursor: "pointer",
        }}
      >
        {map.name}
      </button>
    ))}

    <button
      onClick={() => {
        setMapImage(null);
        setActiveMapId("Customize");
      }}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid #ccc",
        background: activeMapId === "Customize" ? "#4cafef" : "#f0f0f0",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      Customize Map
    </button>
  </div>
</div>


    {/* 右側：地圖容器 + 基因清單 */}
    <div style={{ display: "flex", flexDirection: "row", flex: 1, gap: 16 }}>
      {/* 地圖容器 */}
      <div
        id="map-container"
  className="map-container"
  style={{
    position: "relative",
    width: conW,
    height: conH,
    userSelect: "none",
    flexShrink: 0,
  }}
  onMouseMove={handleMouseMove}
>
  {/* 還沒載入時什麼都不顯示 */}
  {mapImage && !mapLoaded && (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        color: "#666",
      }}
    >
      Loading map...
    </div>
  )}

  {/* 地圖載入完成才顯示 */}
  {mapImage && (
    <img
      src={mapImage}
      alt="Map"
      width={imgW}
      height={imgH}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1,
        display: mapLoaded ? "block" : "none", // 👈 沒載入完成不顯示
      }}
      onLoad={() => setMapLoaded(true)} // 👈 載入完成才改為 true
    />
  )}

  {/* 連線：地圖載入後才顯示 */}
  {mapLoaded && (
    <svg
      width={conW}
      height={conH}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="gray" />
        </marker>
      </defs>
      {Object.entries(filteredCityGeneData).map(([city, chartData]) => {
        const from = chartData.originalContainerCoordinates;
        const to = chartData.containerCoordinates;
        const shouldDraw =
          chartData.line &&
          from &&
          to &&
          (from.cx !== to.cx || from.cy !== to.cy);
        return (
          shouldDraw && (
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
              opacity={0.7}
              style={{ zIndex: 20 }}
            />
          )
        );
      })}
    </svg>
  )}

  {/* 圓餅圖：地圖載入後才顯示 */}
  {mapLoaded &&
    Object.entries(filteredCityGeneData).map(([city, chartData]) => (
      <CityPieChart
        key={city}
        city={city}
        chartData={{
          data: chartData.data,
          totalCount: chartData.totalCount,
        }}
        geneColors={geneColors}
        position={chartData.containerCoordinates}
        opacity={1}
      />
    ))}

        {/* 滑鼠座標 */}
        <div
          className="coord-label"
          style={{
            position: "absolute",
            right: 1,
            padding: 6,
            borderRadius: 6,
            background: "rgba(122, 120, 120, 0.53)",
          }}
        >
          longitude: {decimalToDegreeMinute(latLon.lon)}E
          <br />
          latitude: {decimalToDegreeMinute(latLon.lat)}N
        </div>
      </div>

      {/* 基因清單 */}
      <div style={{ width: 300 }}>
        <h4>Select display genes：</h4>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search"
          className="search-input"
        />
        <div className="flex flex-gap-5" style={{ marginBottom: "8px" }}>
          <button onClick={handleSelectAll}>All</button>
          <button onClick={handleClearAll}>Clear</button>
        </div>

        <div style={{ maxHeight: "460px", overflowY: "auto", paddingRight: "5px" }}>
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

        <div className="pagination-controls" style={{ marginTop: "8px" }}>
          <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
            Previous page
          </button>
          <span> {currentPage + 1} / {totalPages} </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next page
          </button>
        </div>
      </div>
    </div>
  </div>
);

};

export default FilteredTaiwanMapComponent;
