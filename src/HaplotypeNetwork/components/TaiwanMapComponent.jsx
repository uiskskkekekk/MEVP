import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates3 } from "../data/cityCoordinates3";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import "../components/AppStyles.css";

// ---------- 子元件：城市圓餅圖 ----------
const CityPieChart = memo(
  ({ city, chartData, geneColors, position, opacity }) => {
    if (!position || typeof position.cx !== "number" || typeof position.cy !== "number")
      return null;

    const { data, totalCount } = chartData;
    const outerRadius = Math.min(5 + Math.floor(totalCount / 5) * 5, 25);

    // center the pie by translating -50% -50%
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
    JSON.stringify(prev.chartData.data) === JSON.stringify(next.chartData.data)
);

// ---------- 主元件 ----------
const TaiwanMapComponent = ({
  genes,
  cityGeneData,
  totalCityGeneData,
  geneColors,
  onSelectedGenesChange,
  coordinateOverrides = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [cityVisibility, setCityVisibility] = useState({});
  const [mapPage, setMapPage] = useState(0); // 0: cityGeneData, 1: totalCityGeneData

  const [citySearchTerm, setCitySearchTerm] = useState("");

  const genesPerPage = 100;
  const activeCityGeneData = mapPage === 0 ? cityGeneData : totalCityGeneData;

  const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);

  useEffect(() => {
    if (!initialized && allGenes.length > 0) {
      setSelectedGenes(allGenes);
      setInitialized(true);
    }
  }, [allGenes, initialized]);

  useEffect(() => {
    if (!activeCityGeneData) return;
    const initialVisibility = Object.keys(activeCityGeneData).reduce((acc, city) => {
      acc[city] = true;
      return acc;
    }, {});
    setCityVisibility(initialVisibility);
  }, [activeCityGeneData]);

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

  const toggleGene = (name) =>
    setSelectedGenes((prev) => (prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]));

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  // ---------- 坐標系設定 ----------
  // image coordinate system (inside image): 465 x 658.5
  const IMG_W = 465;
  const IMG_H = 658.5;
  // container coordinate system (full): 800 x 1000
  const CON_W = 800;
  const CON_H = 1000;

  // offsets to center the image inside the container
  const offsetX = (CON_W - IMG_W) / 2; // left margin inside container
  const offsetY = (CON_H - IMG_H) / 2; // top margin inside container

  const adjustCoordinatesToContainer = (cx, cy) => {
    // cx,cy expected in image-space (0..IMG_W, 0..IMG_H)
    return { cx: cx + offsetX, cy: cy + offsetY };
  };

// 紅框範圍（圖片內座標）
const RED_LEFT = (IMG_W - 465) / 2;  // 左邊界
const RED_RIGHT = RED_LEFT + 465;    // 右邊界
const RED_TOP = (IMG_H - 658.5) / 2; // 上邊界
const RED_BOTTOM = RED_TOP + 658.5;  // 下邊界


// 找到最近且未被使用的座標
const getNewCoordinates = (originalCoordinates, usedCoordinates) => {
  const { cx, cy } = originalCoordinates;

  // 找出候選外圍座標（依照你的分類條件）
  let availableCoordinates = [];
  if (cy < IMG_H / 3) {
    availableCoordinates = cityCoordinates3.filter(coord => coord.cy <= 200);
  } else if (cy > IMG_H / 3 * 2) {
    availableCoordinates = cityCoordinates3.filter(coord => coord.cy >= IMG_H);
  } else if (cx < IMG_W / 2) {
    availableCoordinates = cityCoordinates3.filter(coord => coord.cx <= 0);
  } else if (cx > IMG_W / 2) {
    availableCoordinates = cityCoordinates3.filter(coord => coord.cx >= IMG_W);
  } else {
    // 紅框內 → 判斷最近邊界
    const distTop = cy - RED_TOP;
    const distBottom = RED_BOTTOM - cy;
    const distLeft = cx - RED_LEFT;
    const distRight = RED_RIGHT - cx;
    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    if (minDist === distLeft) {
      availableCoordinates = cityCoordinates3.filter(coord => coord.cx <= 167.5);
    } else if (minDist === distRight) {
      availableCoordinates = cityCoordinates3.filter(coord => coord.cx >= 632.5);
    } else if (minDist === distTop) {
      availableCoordinates = cityCoordinates3.filter(coord => coord.cy <= 100);
    } else {
      availableCoordinates = cityCoordinates3.filter(coord => coord.cy >= 830);
    }
  }

  // 按距離排序
  const sortedAvailableCoordinates = availableCoordinates
    .map(coord => ({ coord, distance: Math.hypot(cx - coord.cx, cy - coord.cy) }))
    .sort((a, b) => a.distance - b.distance);

  // 找出第一個沒被用過的
  for (const { coord } of sortedAvailableCoordinates) {
    if (!usedCoordinates.some(u => u.cx === coord.cx && u.cy === coord.cy)) {
      return coord;
    }
  }

  // 沒找到就回原座標
  return originalCoordinates;
};



const filteredCityGeneData = useMemo(() => {
  if (!activeCityGeneData) return {};

  const usedCoordinates = [];
  const originalCoordinatesList = Object.entries(activeCityGeneData).map(([city, content]) => ({
    city,
    coords: { cx: content.coordinates.cx, cy: content.coordinates.cy }
  }));

  return Object.entries(activeCityGeneData).reduce((acc, [city, content]) => {
    const genesList =
      mapPage === 1 ? content.genes : (content.genes || []).filter((g) => selectedGenes.includes(g.name));
    if (!genesList || genesList.length === 0) return acc;

    const totalCount = genesList.reduce((sum, g) => sum + g.value, 0);

    const originalImgCoords = { cx: content.coordinates.cx, cy: content.coordinates.cy };
    const originalContainerCoords = adjustCoordinatesToContainer(originalImgCoords.cx, originalImgCoords.cy);

    let finalImgCoords = originalImgCoords;
    let line = null;

   
     if (totalCount < 10) {
      // 檢查是否有別的原座標距離小於等於 50
      const hasNearby = originalCoordinatesList.some(item => {
        if (item.city === city) return false;
        const dist = Math.hypot(originalImgCoords.cx - item.coords.cx, originalImgCoords.cy - item.coords.cy);
        return dist <= 50;
      });

      if (hasNearby) {
        const shiftedImg = getNewCoordinates(originalImgCoords, usedCoordinates);
        finalImgCoords = shiftedImg;
        line = { from: originalContainerCoords, to: adjustCoordinatesToContainer(finalImgCoords.cx, finalImgCoords.cy) };
      }
    }

     else if (totalCount > 10) {
      // 原本的條件
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
}, [activeCityGeneData, selectedGenes, mapPage]);

// 過濾後的城市清單
const filteredCityList = useMemo(
  () =>
    Object.keys(filteredCityGeneData || {}).filter((city) =>
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    ),
  [filteredCityGeneData, citySearchTerm]
);


  const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left - offsetX; // 扣掉水平偏移
  const y = e.clientY - rect.top - offsetY;  // 扣掉垂直偏移

  // 確保滑鼠在圖片範圍內
  if (x >= 0 && x <= IMG_W && y >= 0 && y <= IMG_H) {
    const lon = 120.0 + (x / IMG_W) * 2;  // 根據圖片寬度換算
    const lat = 25.0 - (y / IMG_H) * 3;   // 根據圖片高度換算
    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  }
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

  return (



    <div className="flex flex-col flex-gap-10">
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setMapPage((prev) => (prev === 0 ? 1 : 0))}>
          {mapPage === 0 ? "Next page (total quantity chart）" : "Previous page (Gene map）"}
        </button>
      </div>

      <button onClick={handleExportPNG} style={{ marginTop: 10 }}>
            Export map PNG + Haplotype List
          </button>

      {/* container sized SVG and image */}
      <div
        id="map-container"
        className="map-container"
        style={{ position: "relative", width: CON_W, height: CON_H, userSelect: "none" }}
        onMouseMove={handleMouseMove}
      >
        {/* Background image centered inside container (image-space) */}
        <img
          src={TaiwanMapImage}
          alt="Taiwan Map"
          width={IMG_W}
          height={IMG_H}
           style={{
      backgroundColor: "rgba(23, 10, 96, 0.85)",
      
      position: "absolute",
      top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
      zIndex:1
    }}
        />

        {/* main SVG matches container size so lines and other visuals can go outside the image */}
        <svg
    width={CON_W}
    height={CON_H}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      pointerEvents: "none",
      zIndex: 0,
     
    }}
  >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="gray" />
            </marker>
          </defs>

          {/* draw dashed connector lines (when moved) */}
          {Object.entries(filteredCityGeneData).map(([city, chartData]) => {
            const from = chartData.originalContainerCoordinates;
            const to = chartData.containerCoordinates;
            const shouldDraw = chartData.line && from && to && (from.cx !== to.cx || from.cy !== to.cy);
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

        {/* render pies as absolutely positioned divs inside the container */}
        {Object.entries(filteredCityGeneData).map(([city, chartData]) => (
          <CityPieChart
            key={city}
            city={city}
            chartData={{ data: chartData.data, totalCount: chartData.totalCount }}
            geneColors={geneColors}
            position={chartData.containerCoordinates}
            opacity={cityVisibility[city] ? 1 : 0.12}
          />
        ))}

        <div
          className="coord-label"
          style={{ position: "absolute", right: 8, bottom: 8, background: "rgba(185, 187, 185, 0.8)", padding: 6, borderRadius: 6 }}
        >
          longitude: {latLon.lon}°E
          <br />
          latitude: {latLon.lat}°N
        </div>
      </div>

      <div className="flex flex-row flex-gap-10 justify-start">
        <div className="gene-control-panel">
          <h4>Select display genes：</h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="search-input"
          />

          <div className="button-group">
            <button onClick={handleSelectAll}>all</button>
            <button onClick={handleClearAll}>Clear</button>
            <span style={{ marginLeft: "auto" }}>{selectedGenes.length} / {allGenes.length}</span>
          </div>

          <div className="scroll-y" style={{ maxHeight: 400, border: "1px solid #cec1c1ff" }}>
            {currentGenes.map((name) => (
              <label key={name} className="gene-checkbox">
                <input type="checkbox" checked={selectedGenes.includes(name)} onChange={() => toggleGene(name)} />
                <span style={{ color: geneColors[name] || "black" }}>{name}</span>
              </label>
            ))}
          </div>

          <div className="pagination-controls">
            <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
              Previous page
            </button>
            <span>
              {currentPage + 1} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
              Next page
            </button>
          </div>
        </div>

      <div className="city-visibility-control">
  <h4>City display control：</h4>

  {/* 搜尋框 */}
  <input
    type="text"
    value={citySearchTerm}
    onChange={(e) => setCitySearchTerm(e.target.value)}
    placeholder="Search city"
    className="search-input"
    style={{ marginBottom: 6 }}
  />

  <div className="button-group" style={{ marginBottom: 6 }}>
    <button
      onClick={() =>
        setCityVisibility((prev) => {
          const updated = { ...prev };
          filteredCityList.forEach((city) => {
            updated[city] = true;
          });
          return updated;
        })
      }
    >
      all
    </button>
    <button
      onClick={() =>
        setCityVisibility((prev) => {
          const updated = { ...prev };
          filteredCityList.forEach((city) => {
            updated[city] = false;
          });
          return updated;
        })
      }
    >
      Clear
    </button>
    
  </div>

  <div className="scroll-y" style={{ maxHeight: 500 }}>
    {filteredCityList.map((city) => (
      <label key={city} style={{ display: "block", marginBottom: 4 }}>
        <input
          type="checkbox"
          checked={cityVisibility[city] || false}
          onChange={() =>
            setCityVisibility((prev) => ({ ...prev, [city]: !prev[city] }))
          }
        />
        {city}
      </label>
    ))}
  </div>



          
        </div>
      </div>
    </div>
  );
};

export default TaiwanMapComponent;
