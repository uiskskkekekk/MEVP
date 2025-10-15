import React, { useState } from "react";
import CityPieChart from "./CityPieChart";


const MapMainView = ({
  conW,
  conH,
  mapImage,
  imgW,
  imgH,
  filteredCityGeneData,
  cityVisibility,
  selectedCity,
  setSelectedCity,
  geneColors,
  latLon,
  handleMouseMove,
  decimalToDegreeMinuteWithDir,
  handleExportPNG,
  mapLoaded,
  setFileName
}) => {

  const [localFileName, setLocalFileName] = useState("map");

  const handleFileNameChange = (e) => {
    const newFileName = e.target.value;
    setLocalFileName(newFileName); 
    setFileName(newFileName); // 更新父層的檔名
  };

  return (
    <div style={{ flex: 1, display: "flex", gap: 16, flexDirection: "column" }}>
      {/* 🔼 Export 按鈕放最上方 */}
       <div style={{ alignSelf: "flex-start", marginBottom: 8 }}>
        <input
          type="text"
          value={localFileName}
          onChange={handleFileNameChange} // 設置檔名
          placeholder="Enter file name"
          style={{ marginRight: 10 }}
        />
        <button onClick={() => handleExportPNG(localFileName)}>Export Map PNG + Haplotype List</button>
      </div>

      {/* 🗺️ 地圖容器與城市資訊 */}
      <div style={{ display: "flex", gap: 16, flex: 1, marginTop: "25px"   }}>
        {/* 選中城市基因分布 */}
        {selectedCity && filteredCityGeneData[selectedCity] && (
          <div
            style={{
              marginTop: 50,
              marginRight: 1, // 與地圖間距
              minWidth: "25%",
              maxWidth: "40%",
              padding: 5,
              border: "5px solid #ccc",
              borderRadius: 10,
              height: imgH + 100, // 固定高度
              overflowY: "auto"
            }}
          >
            <h4>{selectedCity}  Distribution</h4>
            <ul>
              {filteredCityGeneData[selectedCity].data.map((g) => (
                <li
                  key={g.name}
                  style={{ display: "flex", alignItems: "center", gap: 3 }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: geneColors[g.name] || "#fff7f7ff"
                    }}
                  />
                  {g.name}: {g.value}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
              Total quantity: {filteredCityGeneData[selectedCity].totalCount}
            </div>
          </div>
        )}

        {/* 地圖本體 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            id="map-container"
            style={{
              position: "relative",
              width: conW+50,
              height: conH,
              userSelect: "none"
            }}
            onMouseMove={handleMouseMove}
          >
            {mapImage && (
              <img
                src={mapImage}
                alt="Map"
                width={imgW}
                height={imgH}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 0,
                  pointerEvents: "none",
                  border: "2px solid #ccc"
                }}
              />
            )}

            {/* 🔹 箭頭圖層 */}
            <svg
              width={conW}
              height={conH}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                zIndex: 2
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
                  const to = chartData.containerCoordinates; // ✅ 已是圓心
                  const shouldDraw =
                    chartData.line &&
                    from &&
                    to &&
                    (from.cx !== to.cx || from.cy !== to.cy);
                  return (
                    shouldDraw && (
                     <React.Fragment key={`line-${city}`}>
                      <line
                        key={`line-${city}`}
                        x1={from.cx || 0}
                        y1={from.cy || 0}
                        x2={to.cx  || 0}
                        y2={to.cy  || 0}
                        stroke="gray"
                        strokeWidth={0.9}
                        strokeDasharray="10,4"
                        markerEnd="url(#arrow)"
                        opacity={0.9}
                      />    
                      <circle
                        cx={from.cx || 0}
                        cy={from.cy || 0}
                        r="2" // radius of the small dot
                        fill="red" // color of the dot
                        opacity={0.9} // optional opacity for the dot
                      />

                     </React.Fragment>         
                    )
                  );               
                })}
            </svg>

            {/* 🔹 餅圖 */}
            {mapLoaded &&
              Object.entries(filteredCityGeneData).map(([city, chartData]) => (
                <CityPieChart
                  key={city}
                  city={city}
                  chartData={{
                    data: chartData.data,
                    totalCount: chartData.totalCount
                  }}
                  geneColors={geneColors}
                  position={chartData.containerCoordinates} // ✅ 圓心位置
                  opacity={cityVisibility[city] ? 1 : 0.12}
                  onClick={() => setSelectedCity(city)}
                  isSelected={selectedCity === city}
                />
              ))}
          </div>

          {/* 📍 經緯度顯示 */}
          <div
            style={{
              
              marginTop: 5,
              padding: 6,
              border: "1px solid #ff0000ff",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.6)",
              fontSize: 20
            }}
          >
            longitude: {decimalToDegreeMinuteWithDir(parseFloat(latLon.lon), "lon")}
            <br />
            latitude: {decimalToDegreeMinuteWithDir(parseFloat(latLon.lat), "lat")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapMainView;