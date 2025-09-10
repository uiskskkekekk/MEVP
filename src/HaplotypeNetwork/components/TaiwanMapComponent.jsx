import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { mapImages } from "../data/mapImages";
import { generateCityCoordinates } from "../data/cityCoordinates3";

import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import "../components/AppStyles.css";

// ---------- 子元件：城市圓餅圖 ----------
const CityPieChart = memo(
  ({ city, chartData, geneColors, position, opacity, onClick, isSelected  }) => {
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

          cursor: "pointer",

        }}
        onClick={onClick}
      >        
        <PieChart width={outerRadius * 2} height={outerRadius * 2}>

          {/* 外框圈選效果 */}
          {isSelected && (
            <circle
              cx="50%"
              cy="50%"
              r={outerRadius + 2}
              fill="none"
              stroke="black"
              strokeWidth={4}
            />
          )}

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
    prev.position?.cy === next.position?.cy&&
    prev.isSelected === next.isSelected
);

// ---------- 主元件 ----------
const TaiwanMapComponent = ({
  genes,
  cityGeneData,
  totalCityGeneData,
  geneColors,
  selectedGenes,
  onSelectedGenesChange,
  cityVisibility,
  onCityVisibilityChange,
  coordinateOverrides = {},
  onMapSettingsChange,   // 👈 加這個
}) => {
  const [searchTerm, setSearchTerm] = useState("");
const [currentPage, setCurrentPage] = useState(0);
const [initialized, setInitialized] = useState(false);
const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
const [mapPage, setMapPage] = useState(0); // 0: cityGeneData, 1: totalCityGeneData
const [citySearchTerm, setCitySearchTerm] = useState("");
const [selectedChart, setSelectedChart] = useState(null);  // 👈 新增
const [selectedCity, setSelectedCity] = useState(null);


// --- 地圖圖片與設定 ---
const [activeMapId, setActiveMapId] = useState(null);
const [mapUrl, setMapUrl] = useState(null);
const [mapLoaded, setMapLoaded] = useState(false);
const [mapImage, setMapImage] = useState(null);
const [imgW, setImgW] = useState(null);
const [imgH, setImgH] = useState(null);
const [lonRange, setLonRange] = useState([null, null]);
const [latRange, setLatRange] = useState([null, null]);
const [lonDirMin, setLonDirMin] = useState("E");
const [lonDirMax, setLonDirMax] = useState("E");
const [latDirMin, setLatDirMin] = useState("N");
const [latDirMax, setLatDirMax] = useState("N");



const conW = imgW + 350;
const conH = imgH + 350;

// --- 將設定回傳給父層 ---
useEffect(() => {
  onMapSettingsChange?.({ imgW, imgH, lonRange, latRange });
}, [imgW, imgH, lonRange, latRange, onMapSettingsChange]);

// ---------- 切換地圖 ----------
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

    const maxSize = 500;
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

    setLonDirMin(map.lonDirMin || "E");
    setLonDirMax(map.lonDirMax || "E");
    setLatDirMin(map.latDirMin || "N");
    setLatDirMax(map.latDirMax || "N");
  

    // 計算真正的範圍值
    setLonRange([
      Math.abs(map.defaultLonRange[0]) * (map.lonDirMin === "W" ? -1 : 1),
      Math.abs(map.defaultLonRange[1]) * (map.lonDirMax === "W" ? -1 : 1),
    ]);

    setLatRange([
      Math.abs(map.defaultLatRange[0]) * (map.latDirMin === "S" ? -1 : 1),
      Math.abs(map.defaultLatRange[1]) * (map.latDirMax === "S" ? -1 : 1),
    ]);

  };
};

// ---------- 上傳自訂地圖 ----------
const handleImageUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    let newWidth = img.naturalWidth;
    let newHeight = img.naturalHeight;

    const maxSize = 500;
    if (Math.max(newWidth, newHeight) > maxSize) {
      const scale = maxSize / Math.max(newWidth, newHeight);
      newWidth = Math.round(newWidth * scale);
      newHeight = Math.round(newHeight * scale);
    }

    setActiveMapId("Customize");
    setMapImage(url);
    setImgW(newWidth);
    setImgH(newHeight);
  };
  img.src = url;
};

// ---------- 外部可用座標 ----------
const [cityCoordinates3, setCityCoordinates3] = useState([]);
useEffect(() => {
  setCityCoordinates3(generateCityCoordinates(imgW, imgH, 200, 75));
}, [imgW, imgH]);

// ---------- 基因資料與篩選 ----------
const genesPerPage = 10;
const activeCityGeneData = mapPage === 0 ? cityGeneData : totalCityGeneData;
const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);

useEffect(() => {
  if (!initialized && allGenes.length > 0) {
    onSelectedGenesChange?.(allGenes);
    setInitialized(true);
  }
}, [allGenes, initialized, onSelectedGenesChange]);

useEffect(() => {
  if (!activeCityGeneData) return;
  const initialVisibility = Object.keys(activeCityGeneData).reduce((acc, city) => {
    acc[city] = true;
    return acc;
  }, {});
  onCityVisibilityChange?.(initialVisibility);
}, [activeCityGeneData, onCityVisibilityChange]);

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
  const updated = selectedGenes.includes(name)
    ? selectedGenes.filter((g) => g !== name)
    : [...selectedGenes, name];
  onSelectedGenesChange?.(updated);
};

const handleSelectAll = () => onSelectedGenesChange?.(filteredGeneList);
const handleClearAll = () => onSelectedGenesChange?.([]);

// ---------- 坐標系設定 ----------
const offsetX = (conW - imgW) / 2;
const offsetY = (conH - imgH) / 2;

const adjustCoordinatesToContainer = (cx, cy) => ({ cx: cx + offsetX, cy: cy + offsetY });

const RED_LEFT = (imgW - 465) / 2;
const RED_RIGHT = RED_LEFT + 465;
const RED_TOP = (imgH - 658.5) / 2;
const RED_BOTTOM = RED_TOP + 658.5;

const getNewCoordinates = (originalCoordinates, usedCoordinates) => {
  const { cx, cy } = originalCoordinates;
  let availableCoordinates = [];

  if (cy < imgH / 3) {
    availableCoordinates = cityCoordinates3.filter((coord) => coord.cy <= imgH / 3);
  } else if (cy > (imgH / 3) * 2) {
    availableCoordinates = cityCoordinates3.filter((coord) => coord.cy >= imgH);
  } else if (cx < imgW / 2) {
    availableCoordinates = cityCoordinates3.filter((coord) => coord.cx <= 0);
  } else if (cx > imgW / 2) {
    availableCoordinates = cityCoordinates3.filter((coord) => coord.cx >= imgW);
  } else {
    const distTop = cy - RED_TOP;
    const distBottom = RED_BOTTOM - cy;
    const distLeft = cx - RED_LEFT;
    const distRight = RED_RIGHT - cx;
    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    if (minDist === distLeft) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cx <= 0 || coord.cy <= 0 || coord.cy >= imgH
      );
    } else if (minDist === distRight) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cx >= imgW || coord.cy <= 0 || coord.cy >= imgH
      );
    } else if (minDist === distTop) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cy <= 0 || coord.cx <= 0 || coord.cx >= imgW
      );
    } else {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cy >= imgH || coord.cx <= 0 || coord.cx >= imgW
      );
    }
  }

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

// ---------- 過濾城市基因資料 ----------
const filteredCityGeneData = useMemo(() => {
  if (!activeCityGeneData) return {};

  const usedCoordinates = [];
  const originalCoordinatesList = Object.entries(activeCityGeneData).map(([city, content]) => ({
    city,
    coords: { cx: content.coordinates.cx, cy: content.coordinates.cy },
  }));

  return Object.entries(activeCityGeneData).reduce((acc, [city, content]) => {
    const genesList =
      mapPage === 1
        ? content.genes
        : (content.genes || []).filter((g) => selectedGenes.includes(g.name));
    if (!genesList || genesList.length === 0) return acc;

    const totalCount = genesList.reduce((sum, g) => sum + g.value, 0);
    const originalImgCoords = { cx: content.coordinates.cx, cy: content.coordinates.cy };
    const originalContainerCoords = adjustCoordinatesToContainer(originalImgCoords.cx, originalImgCoords.cy);

    let finalImgCoords = originalImgCoords;
    let line = null;

    if (totalCount < 10) {
      const hasNearby = originalCoordinatesList.some((item) => {
        if (item.city === city) return false;
        const dist = Math.hypot(originalImgCoords.cx - item.coords.cx, originalImgCoords.cy - item.coords.cy);
        return dist <= 50;
      });

      if (hasNearby) {
        const shiftedImg = getNewCoordinates(originalImgCoords, usedCoordinates);
        finalImgCoords = shiftedImg;
        line = { from: originalContainerCoords, to: adjustCoordinatesToContainer(finalImgCoords.cx, finalImgCoords.cy) };
      }
    } else if (totalCount > 10) {
      const shiftedImg = getNewCoordinates(originalImgCoords, usedCoordinates);
      finalImgCoords = shiftedImg;
      line = { from: originalContainerCoords, to: adjustCoordinatesToContainer(finalImgCoords.cx, finalImgCoords.cy) };
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
}, [activeCityGeneData, selectedGenes, mapPage, imgW, imgH, lonRange, latRange]);

const filteredCityList = useMemo(
  () =>
    Object.keys(filteredCityGeneData || {}).filter((city) =>
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    ),
  [filteredCityGeneData, citySearchTerm]
);

// ---------- 滑鼠座標轉換 ----------
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

// ---------- 座標格式轉換 ----------
const decimalToDegreeMinuteWithDir = (decimal, type) => {
  const absVal = Math.abs(decimal);
  const deg = Math.floor(absVal);
  const min = Math.round((absVal - deg) * 60);

  if (type === "lon") {
    return `${deg}°${min}′ ${decimal >= 0 ? "E" : "W"}`;
  } else {
    return `${deg}°${min}′ ${decimal >= 0 ? "N" : "S"}`;
  }
};

// ---------- 匯出 PNG ----------
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
  ctx.fillStyle = "#f8f8f8ff";
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

// ---------- 初始頁面設定 ----------
useEffect(() => {
  if (cityGeneData && Object.keys(cityGeneData).length > 0) setMapPage(0);
}, [cityGeneData]);

useEffect(() => {
  if (totalCityGeneData && Object.keys(totalCityGeneData).length > 0) setMapPage(1);
}, [totalCityGeneData]);

const hasCityGeneData = Boolean(cityGeneData && Object.keys(cityGeneData).length > 0);
const hasTotalCityGeneData = Boolean(totalCityGeneData && Object.keys(totalCityGeneData).length > 0);

// 如果資料改變而選中的 city 不見了，就清掉選取
useEffect(() => {
  if (selectedCity && !(filteredCityGeneData && filteredCityGeneData[selectedCity])) {
    setSelectedCity(null);
  }
}, [filteredCityGeneData, selectedCity]);


return (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    
    {/* --- 最上方：Gene Map 切換按鈕 --- */}
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={() => setMapPage(0)}
        disabled={!hasCityGeneData}
        style={{
          display: "none",
          backgroundColor: mapPage === 0 ? "#0a7cefff" : "#f0f0f0",
          padding: "6px 12px",
          cursor: hasCityGeneData ? "pointer" : "not-allowed",
          opacity: hasCityGeneData ? 1 : 0.6,
          borderRadius: 4,
          border: "1px solid #ccc",
        }}
      >
        Gene Map
      </button>

      <button
        onClick={() => setMapPage(1)}
        disabled={!hasTotalCityGeneData}
        style={{
          display: "none",
          backgroundColor: mapPage === 1 ? "#4cafef" : "#f0f0f0",
          padding: "6px 12px",
          cursor: hasTotalCityGeneData ? "pointer" : "not-allowed",
          opacity: hasTotalCityGeneData ? 1 : 0.6,
          borderRadius: 4,
          border: "1px solid #ccc",
        }}
      >
        Total quantity chart
      </button>

      <div
        style={{
          marginLeft: 12,
          fontSize: 13,
          color: "#444",
          display: "none",
        }}
      >
        Active:{" "}
        {mapPage === 0
          ? "Gene Map (cityGeneData)"
          : "Total quantity (totalCityGeneData)"}
      </div>
    </div>

    {/* --- 上傳與設定區 + 地圖清單區 --- */}
    <div style={{ display: "flex", gap: 16 }}>
      {/* 左側：上傳與設定區 + 地圖清單 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 , width:300 }}>
        {/* 上傳與設定區 */}
        <div>
          <label>Upload Map PNG: </label>
          <input type="file" accept="image/png" onChange={handleImageUpload} />
        </div>

        {/* 地圖清單 */}
        <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 300,
          alignSelf: "flex-start",
        }}
      >
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

        <div style={{ marginTop: 8 }}>
          <label>Image Width: </label>
          <input
            type="number"
            value={imgW ?? ""}
            onChange={(e) => setImgW(Number(e.target.value))}
            className="small-input"
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <label>Image Height: </label>
          <input
            type="number"
            value={imgH ?? ""}
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

        {/* Longitude Range */}
        <div style={{ marginTop: 8 }}>
          <label>Longitude Range: </label>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={lonDirMin}
              onChange={(e) => {
                setLonDirMin(e.target.value);
                setLonRange([
                  Math.abs(lonRange[0]) * (e.target.value === "E" ? 1 : -1),
                  lonRange[1],
                ]);
              }}
            >
              <option value="E">E</option>
              <option value="W">W</option>
            </select>
            <input
              type="number"
              value={Math.abs(lonRange[0])}
              onChange={(e) =>
                setLonRange([
                  +e.target.value * (lonDirMin === "E" ? 1 : -1),
                  lonRange[1],
                ])
              }
              className="small-input"
            />
            -
            <select
              value={lonDirMax}
              onChange={(e) => {
                setLonDirMax(e.target.value);
                setLonRange([
                  lonRange[0],
                  Math.abs(lonRange[1]) * (e.target.value === "E" ? 1 : -1),
                ]);
              }}
            >
              <option value="E">E</option>
              <option value="W">W</option>
            </select>
            <input
              type="number"
              value={Math.abs(lonRange[1])}
              onChange={(e) =>
                setLonRange([
                  lonRange[0],
                  +e.target.value * (lonDirMax === "E" ? 1 : -1),
                ])
              }
              className="small-input"
            />
          </div>
        </div>

        {/* Latitude Range */}
        <div style={{ marginTop: 8 }}>
          <label>Latitude Range: </label>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={latDirMin}
              onChange={(e) => {
                setLatDirMin(e.target.value);
                setLatRange([
                  Math.abs(latRange[0]) * (e.target.value === "N" ? 1 : -1),
                  latRange[1],
                ]);
              }}
            >
              <option value="N">N</option>
              <option value="S">S</option>
            </select>
            <input
              type="number"
              value={Math.abs(latRange[0])}
              onChange={(e) =>
                setLatRange([
                  +e.target.value * (latDirMin === "N" ? 1 : -1),
                  latRange[1],
                ])
              }
              className="small-input"
            />
            -
            <select
              value={latDirMax}
              onChange={(e) => {
                setLatDirMax(e.target.value);
                setLatRange([
                  latRange[0],
                  Math.abs(latRange[1]) * (e.target.value === "N" ? 1 : -1),
                ]);
              }}
            >
              <option value="N">N</option>
              <option value="S">S</option>
            </select>
            <input
              type="number"
              value={Math.abs(latRange[1])}
              onChange={(e) =>
                setLatRange([
                  latRange[0],
                  +e.target.value * (latDirMax === "N" ? 1 : -1),
                ])
              }
              className="small-input"
            />
          </div>
        </div>                
      </div>

      {/* 選中的圓餅圖資訊顯示區 */}
        {selectedCity && filteredCityGeneData[selectedCity] && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ccc", borderRadius: 6 }}>
           <h4>{selectedCity} Gene distribution</h4>
          <ul>
            {filteredCityGeneData[selectedCity].data.map((g) => (
            <li key={g.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
              background: geneColors[g.name] || "#bbb"
              }} />
              {g.name}: {g.value}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
          Total quantity: {filteredCityGeneData[selectedCity].totalCount}
        </div>
        </div>
      )}

      {/* 右側：地圖容器 */}
      <div style={{ flex: 1 }}>
        <div
          id="map-container"
          className="map-container"
          style={{
            position: "relative",
            width: conW,
            height: conH,
            userSelect: "none",
          }}
          onMouseMove={handleMouseMove}
        >
          {/* 地圖圖片 */}
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
              }}
              onLoad={() => setMapLoaded(true)}
            />
          )}

          {/* 連線 */}
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

            {mapLoaded &&
              Object.entries(filteredCityGeneData).map(([city, chartData]) => {
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

          {/* 圓餅圖 */}
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
                opacity={cityVisibility[city] ? 1 : 0.12}
                onClick={() => setSelectedCity(city)}   // 👈 點擊後立即記錄
                isSelected={selectedCity === city}      // 👈 判斷是否選中
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
            }}
          >
            longitude: {decimalToDegreeMinuteWithDir(parseFloat(latLon.lon), "lon")}
            <br />
            latitude: {decimalToDegreeMinuteWithDir(parseFloat(latLon.lat), "lat")}
          </div>
        </div>

        {/* 匯出按鈕 */}
        <button onClick={handleExportPNG} style={{ marginTop: 10 }}>
          Export Map PNG + Haplotype List
        </button>
      </div>      
    </div>

  </div>
);


};

export default TaiwanMapComponent;

