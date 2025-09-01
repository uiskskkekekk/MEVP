import React, { useEffect, useMemo, useState, useRef } from "react";

import "../components/GeneTable.css";
import { riverToCityMap } from "../data/riverToCityMap";

const GeneTable = ({
  // ==== Data & Gene Props ====
  genes,
  geneColors,
  eDnaSampleContent,
  eDnaTagsContent,

  // ==== Pagination ====
  currentPage,
  itemsPerPage,
  setCurrentPage,

  // ==== Map & City Data ====
  updateMapData,
  setCityGeneData,
  setTotalCityGeneData,
  imgW,
  imgH,
  lonRange,
  latRange,

  // ==== Table Modes ====
  onViewModeChange,
  onHapColorsChange,
  onHapHeadersChange,

  // ==== Hap Pagination ====
  hapPage,
  onHapPageChange,
  hapsPerPage = 10,

  // ==== CSV ====
  fileName,
  csvContent,
  csvFileName,

  // ==== Selection ====
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
  selectedLocations = {},
  onSelectedLocationsChange,

  // ==== Editing ====
  onEditGeneCount,
  onEditGeneCountBulk,

}) => {

  // ======================================
//  GeneTable Component - State & Memo
// ======================================

const [searchTerm, setSearchTerm] = useState("");
const [showOnlySelected, setShowOnlySelected] = useState(false);
const [viewMode, setViewMode] = useState("count");
const [ednaMapping, setEdnaMapping] = useState({});
const [tagMapping, setTagMapping] = useState({});
const [locations, setLocations] = useState([1]);
const [totalTableData, setTotalTableData] = useState([]);

const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [
  externalSelectedGenes,
]);

const HAPS_PER_PAGE = hapsPerPage;
const totalHeaders = totalTableData[0] || [];
const staticHeaders = totalHeaders.slice(0, 2);
const hapHeaders = useMemo(() => totalHeaders.slice(2), [totalHeaders]);

const totalHapPages = Math.ceil(hapHeaders.length / HAPS_PER_PAGE);
const startHapIdx = (hapPage - 1) * HAPS_PER_PAGE;
const endHapIdx = startHapIdx + HAPS_PER_PAGE;
const currentHapHeaders = hapHeaders.slice(startHapIdx, endHapIdx);
const displayedHeaders = [...staticHeaders, ...currentHapHeaders];

const displayedTableData = totalTableData.map((row) =>
  displayedHeaders.map((header) => row[totalHeaders.indexOf(header)] || "")
);

const [filterMode, setFilterMode] = useState("all"); // "all" or "over1percent"
const [hapColors, setHapColors] = useState({});
const [showPercentage, setShowPercentage] = useState(false);
const [speciesOptions, setSpeciesOptions] = useState([]);
const [currentSpecies, setCurrentSpecies] = useState("");
const [totalFileName, setTotalFileName] = useState("");

// ======================================
//  Helper Functions
// ======================================

const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`);

const convertLatLonToXY = (lat, lon) => {
  const mapWidth = imgW;
  const mapHeight = imgH;
  const minLon = lonRange[0];
  const maxLon = lonRange[1];
  const minLat = latRange[0];
  const maxLat = latRange[1];

  const cx = ((lon - minLon) / (maxLon - minLon)) * mapWidth;
  const cy = ((maxLat - lat) / (maxLat - minLat)) * mapHeight;
  return { cx, cy };
};

const getSampleInfo = (geneName) => {
  let sampleId = null;

  // 嘗試從 geneName 找物種與地點
  const match = geneName.match(/(ZpDL|CypDL|xworm)_[A-Za-z0-9-]+/);
  if (match) sampleId = match[0];

  // 如果找不到，再用 fileName 推測
  if (!sampleId && fileName) {
    const speciesPrefix = speciesOptions.find((prefix) =>
      fileName.startsWith(prefix)
    );
    const nameParts = geneName.split("_");
    if (speciesPrefix && nameParts.length > 0) {
      sampleId = `${speciesPrefix}_${nameParts[0]}`;
    }
  }

  const tag = sampleId ? tagMapping[sampleId] : null;
  const shortId = sampleId?.split("_").slice(-1)[0];
  const info = shortId ? ednaMapping[shortId] : null;

  return { sampleId, tag, info };
};

// ======================================
//  useEffect Hooks
// ======================================

// 1️⃣ 表格模式變更
useEffect(() => {
  onViewModeChange?.(viewMode);
}, [viewMode]);

// 2️⃣ CSV → totalTableData
useEffect(() => {
  if (!csvContent) return;

  const rawText = csvContent.trim();
  const lines = rawText.split("\n");
  const originalHeaders = lines[0].split(",").map((h) => h.trim());
  const headers = ["locations", "", ...originalHeaders.slice(1).map((h) => `hap_${h}`)];
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    return headers.map((_, idx) => cells[idx] || "");
  });

  setTotalTableData([headers, ...rows]);
}, [csvContent]);

// 3️⃣ hapHeaders 傳回父層
useEffect(() => {
  onHapHeadersChange?.(hapHeaders);
}, [hapHeaders]);

// 4️⃣ hapColors 設定
useEffect(() => {
  if (viewMode !== "total" || hapHeaders.length === 0) return;

  const colors = generateColors(hapHeaders.length);
  const mapping = {};
  hapHeaders.forEach((hap, idx) => (mapping[hap] = colors[idx]));

  const isSame =
    Object.keys(mapping).length === Object.keys(hapColors).length &&
    Object.keys(mapping).every((key) => mapping[key] === hapColors[key]);

  if (!isSame) {
    setHapColors(mapping);
    onHapColorsChange?.(mapping);
  }
}, [hapHeaders, viewMode]);

// 5️⃣ 更新 genes counts (locations 變更)
useEffect(() => {
  if (locations.length === 0) return;

  const updatedGenes = genes.map((gene) => {
    const newCounts = { ...gene.counts };
    let modified = false;

    locations.forEach((loc) => {
      if (gene.name.includes(loc) && !newCounts[loc]) {
        newCounts[loc] = 1;
        modified = true;
      }
    });

    return modified ? { ...gene, counts: newCounts } : gene;
  });

  const hasChanges = updatedGenes.some((gene, idx) => gene !== genes[idx]);
  if (hasChanges) onEditGeneCountBulk(updatedGenes);
}, [genes, locations]);

// 6️⃣ Map 座標計算 & 基因資料
useEffect(() => {
  if (!locations || locations.length === 0) return;

  const cityMap = {};

  locations.forEach((loc) => {
    const edna = ednaMapping[loc] || {};
    let cx = null,
      cy = null;

    if (!isNaN(parseFloat(edna.Celong1)) && !isNaN(parseFloat(edna.Celat2))) {
      const result = convertLatLonToXY(parseFloat(edna.Celat2), parseFloat(edna.Celong1));
      cx = result.cx;
      cy = result.cy;
    }

    cityMap[loc] = { coordinates: { cx, cy }, genes: [] };
  });

  if (viewMode === "total" && totalTableData.length > 1) {
    const headers = totalTableData[0];
    const rows = totalTableData.slice(1);
    const hapHeaders = headers.slice(2);

    rows.forEach((row) => {
      const loc = row[0];
      const total = parseInt(row[1]) || 0;

      hapHeaders.forEach((hap, idx) => {
        const value = parseInt(row[idx + 2]) || 0;
        const percent = total > 0 ? (value / total) * 100 : 0;
        const shouldInclude =
          filterMode === "all" ? value > 0 : value > 0 && percent >= 1;

        if (shouldInclude) {
          cityMap[loc]?.genes.push({
            name: hap,
            color: hapColors[hap] || "#000",
            value,
          });
        }
      });
    });

    setTotalCityGeneData?.(cityMap);
  } else {
    genes.forEach((gene) => {
      locations.forEach((loc) => {
        const count = gene.counts?.[loc] || 0;
        if (count > 0) {
          cityMap[loc]?.genes.push({
            name: gene.name,
            color: geneColors[gene.name] || "#000",
            value: count,
          });
        }
      });
    });

    setCityGeneData?.(cityMap);
  }
}, [viewMode, totalTableData, hapColors, genes, geneColors, locations, ednaMapping, filterMode, imgW, imgH, lonRange, latRange]);

// 7️⃣ eDNA Mapping
useEffect(() => {
  if (!eDnaSampleContent || eDnaSampleContent.length === 0) return;

  const mapping = {};
  const ids = new Set();

  eDnaSampleContent.forEach((row) => {
    const id = String(row["eDNA_ID"]).trim();
    if (!id) return;

    ids.add(id);
    mapping[id] = {
      river: row["river"] || "No information",
      site: row["sample area"] || "No information",
      Celong1: row["Celong1"] || "No information",
      Celat2: row["Celat2"] || "No information",
    };
  });

  setEdnaMapping(mapping);
  setLocations(Array.from(ids));
}, [eDnaSampleContent]);

// 8️⃣ Tag Mapping
useEffect(() => {
  if (!eDnaTagsContent || eDnaTagsContent.length === 0) return;

  const speciesSet = new Set();
  const mapping = {};

  eDnaTagsContent.forEach((row) => {
    const id = String(row["sample_ID"]).trim();
    const prefix = id.split("_")[0];
    if (prefix && prefix.toLowerCase() !== "sample") speciesSet.add(prefix);

    mapping[id] = {
      sampleId: row["sample_ID"] || "No information",
      barcodeF: row["barcode-F(5'-3')"] || "No information",
      primerF: row["primer-F(5'-3')"] || "No information",
      barcodeR: row["barcode-R(5'-3')"] || "No information",
      primerR: row["primer-R(5'-3')"] || "No information",
    };
  });

  setTagMapping(mapping);
  setSpeciesOptions(Array.from(speciesSet));
}, [eDnaTagsContent]);

// 9️⃣ 當 fileName 更新時，自動選擇當前物種
useEffect(() => {
  if (!fileName || speciesOptions.length === 0) return;

  const match = speciesOptions.find((species) => fileName.startsWith(species));
  if (match) setCurrentSpecies(match);
}, [fileName, speciesOptions]);

// ======================================
//  Derived & Filtered Data
// ======================================

const filteredGenes = useMemo(() => {
  let result = genes.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewMode === "detail" && currentSpecies) {
    result = result.filter((g) => {
      const nameParts = g.name.split("_");
      return (
        nameParts.includes(currentSpecies) ||
        (fileName && fileName.startsWith(currentSpecies))
      );
    });
  }

  if (showOnlySelected) result = result.filter((g) => selectedGenesSet.has(g.name));

  return result;
}, [
  genes,
  searchTerm,
  showOnlySelected,
  selectedGenesSet,
  viewMode,
  currentSpecies,
  fileName,
]);

const paginatedGenes = useMemo(() => {
  const startIdx = (currentPage - 1) * itemsPerPage;
  return filteredGenes.slice(startIdx, startIdx + itemsPerPage);
}, [filteredGenes, currentPage, itemsPerPage]);

// ======================================
//  Handlers
// ======================================

const handleSearchChange = (e) => {
  setSearchTerm(e.target.value);
  if (setCurrentPage) setCurrentPage(1);
};

const handleFileUpload = (e, type) => {
  const file = e.target.files[0];
  if (!file) return;

  if (type === "total") setTotalFileName(file.name);

  const reader = new FileReader();
  reader.onload = (evt) => {
    if (type === "total") {
      const rawText = evt.target.result;
      const lines = rawText.trim().split("\n");
      const originalHeaders = lines[0].split(",").map((h) => h.trim());
      const headers = ["locations", "", ...originalHeaders.slice(1).map((h) => `hap_${h}`)];
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",");
        return headers.map((_, idx) => cells[idx] || "");
      });
      setTotalTableData([headers, ...rows]);
    }
  };

  if (type === "total") reader.readAsText(file);
};

const toggleGeneSelection = (geneName) => {
  const newSelectedGenes = selectedGenesSet.has(geneName)
    ? externalSelectedGenes.filter((name) => name !== geneName)
    : [...externalSelectedGenes, geneName];
  onSelectedGenesChange?.(newSelectedGenes);
};

const toggleLocationSelection = (loc) => {
  const updated = { ...selectedLocations };
  updated[loc] = !updated[loc];
  onSelectedLocationsChange?.(updated);
};

const handleSelectAllGenes = () => onSelectedGenesChange?.(filteredGenes.map((g) => g.name));
const handleClearAllGenes = () => onSelectedGenesChange?.([]);

const handleSelectAllLocations = () =>
  onSelectedLocationsChange?.(locations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {}));

const handleClearAllLocations = () =>
  onSelectedLocationsChange?.(locations.reduce((acc, loc) => ({ ...acc, [loc]: false }), {}));

const handleEditGeneCount = (geneName, location, newValue) => {
  const updatedCount = Math.max(0, Number(newValue) || 0);
  onEditGeneCount(geneName, location, updatedCount);
  setTimeout(() => updateMapData([location]), 0);
};





  return (
  <div style={{ overflowX: "auto", padding: "0px" }}>
    <h2>Gene information table</h2>

    {/* 地圖資訊 */}
    <div>
      <div>Map size: {imgW} x {imgH}</div>
      <div>
        Lon: {lonRange[0]} - {lonRange[1]} | Lat: {latRange[0]} - {latRange[1]}
      </div>
    </div>

    {/* 切換表格類型 */}
    <div style={{ marginBottom: "10px" }}>
      <button onClick={() => setViewMode("count")} style={{ marginRight: "8px" }}>
        FA table
      </button>
      <button onClick={() => setViewMode("detail")} style={{ marginRight: "8px" }}>
        Information table
      </button>
      <button onClick={() => setViewMode("total")}>
        CVS table
      </button>
    </div>

    {/* 搜尋 & 篩選區 */}
    <div
      className="flex"
      style={{ marginBottom: "15px", gap: "15px", alignItems: "center" }}
    >
      {/* 搜尋框 */}
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={handleSearchChange}
        className="search-input"
        style={{ width: 220 }}
      />

      {/* CSV 狀態顯示 */}
      {viewMode === "total" && csvFileName && (
        <span style={{ color: "green", marginLeft: "6px" }}>
          ✔ {csvFileName}
        </span>
      )}

      {/* 篩選大於1%按鈕 */}
      {viewMode === "total" && (
        <div style={{ marginBottom: "10px" }}>
          <button onClick={() => setFilterMode("all")}>Show all</button>
          <button onClick={() => setFilterMode("over1percent")}>
            Show only ≥ 1%
          </button>
        </div>
      )}

      {/* 只顯示已選擇 */}
      {viewMode !== "total" && (
        <label style={{ marginLeft: "auto", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={() => {
              const next = !showOnlySelected;
              if (next && setCurrentPage) setCurrentPage(1);
              setShowOnlySelected(next);
            }}
            style={{ marginRight: "6px" }}
          />
          Only show genes that are checked
        </label>
      )}
    </div>

    {/* === FA Table === */}
    {viewMode === "count" && (
      <div className="gene-table-container view-count">
        {/* 基因/地名全選區塊 */}
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <button onClick={handleSelectAllGenes} style={{ marginRight: "6px" }}>
              All Gene
            </button>
            <button onClick={handleClearAllGenes}>Clear</button>
          </div>
          <div>
            <button
              onClick={handleSelectAllLocations}
              style={{ marginRight: "6px" }}
            >
              All Location
            </button>
            <button onClick={handleClearAllLocations}>Clear</button>
          </div>
        </div>

        {/* Gene Table */}
        <div className="gene-table-wrapper">
          <table className="gene-table">
            <thead>
              <tr>
                <th></th>
                <th>Gene name</th>
                {locations.map((loc) => (
                  <th key={loc}>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedLocations[loc]}
                        onChange={() => toggleLocationSelection(loc)}
                      />
                      <span>{loc}</span>
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedGenes.map((gene) => (
                <tr key={gene.name}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedGenesSet.has(gene.name)}
                      onChange={() => toggleGeneSelection(gene.name)}
                    />
                  </td>
                  <td>
                    <span
                      className="color-box"
                      style={{ backgroundColor: geneColors[gene.name] || "black" }}
                    />
                    {gene.name}
                  </td>
                  {locations.map((loc) => (
                    <td key={`${gene.name}-${loc}`}>
                      <input
                        type="number"
                        min="0"
                        value={gene.counts?.[loc] || 0}
                        onChange={(e) =>
                          handleEditGeneCount(gene.name, loc, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* === Information Table === */}
    {viewMode === "detail" && (
      <>
        {/* 物種切換區 */}
        {speciesOptions.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <b>Species:</b>
            {speciesOptions.map((s) => (
              <button
                key={s}
                onClick={() => setCurrentSpecies(s)}
                style={{
                  marginLeft: 10,
                  backgroundColor:
                    currentSpecies === s ? "#007bff" : "#d0d0d0ff",
                  color: currentSpecies === s ? "white" : "black",
                  borderRadius: 4,
                  padding: "4px 10px",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Gene 詳細資訊表 */}
        <div className="gene-table-container view-detail">
          <div className="gene-table-wrapper">
            <table className="gene-table">
              <thead>
                <tr>
                  <th>Gene name</th>
                  <th>Sampling point number</th>
                  <th>Forward Barcode</th>
                  <th>Forward Primer</th>
                  <th>Reverse Barcode</th>
                  <th>Reverse Primer</th>
                  <th>longitude</th>
                  <th>latitude</th>
                  <th>river</th>
                  <th>sample area</th>
                  <th>County and city</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGenes.map((gene) => {
                  const { tag, info } = getSampleInfo(gene.name);

                  return (
                    <tr key={gene.name}>
                      <td>
                        <span
                          className="color-box"
                          style={{ backgroundColor: geneColors[gene.name] || "black" }}
                        />
                        {gene.name}
                      </td>
                      <td>{tag?.sampleId || "No information"}</td>
                      <td>{tag?.barcodeF || "No information"}</td>
                      <td>{tag?.primerF || "No information"}</td>
                      <td>{tag?.barcodeR || "No information"}</td>
                      <td>{tag?.primerR || "No information"}</td>
                      <td>{info?.Celong1 || "No information"}</td>
                      <td>{info?.Celat2 || "No information"}</td>
                      <td>{info?.river || "No information"}</td>
                      <td>{info?.site || "No information"}</td>
                      <td>
                        {info ? riverToCityMap[info.river] || "No information" : "No information"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}

    {/* === CVS Table === */}
    {viewMode === "total" && totalTableData.length > 0 && (
      <div style={{ marginTop: "30px" }}>
        <h3
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Total Table
          <button onClick={() => setShowPercentage((prev) => !prev)   }  >
            {showPercentage ? "Display value" : "Show percentage"}
          </button>
        </h3>

        <div className="gene-table-container view-total">
          <div className="gene-table-wrapper">
            <table className="gene-table">
              <thead>
                <tr>
                  {displayedHeaders.map((header, idx) => (
                    <th key={idx}>
                      {header.startsWith("hap_") ? (
                        <span
                          style={{ display: "inline-flex", alignItems: "center" }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 12,
                              height: 12,
                              backgroundColor: hapColors[header] || "#101010ff",
                              marginRight: 6,
                              borderRadius: 2,
                            }}
                          />
                          {header}
                        </span>
                      ) : (
                        header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedTableData.slice(1).map((row, rowIndex) => {
                  const total = parseInt(row[1]) || 0; // 第二欄是總數
                  return (
                    <tr key={rowIndex}>
                      {row.map((cell, colIndex) => {
                        const isHapCol = colIndex >= 2;
                        const rawValue = parseInt(cell) || 0;
                        const displayValue = isHapCol
                          ? showPercentage
                            ? total > 0
                              ? `${((rawValue / total) * 100).toFixed(2)}%`
                              : "0.00%"
                            : rawValue
                          : cell;
                        const bgColor =
                          isHapCol && rawValue === 0 ? "#ffffffff" : undefined;

                        return (
                          <td
                            key={colIndex}
                            style={{ backgroundColor: bgColor, textAlign: "center" }}
                          >
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CVS table 翻頁按鈕 */}
          <div className="pagination" style={{ marginTop: "10px" }}>
            <button
              onClick={() => onHapPageChange?.(Math.max(1, hapPage - 1))}
              disabled={hapPage === 1}
            >
              Previous
            </button>
            <span>
              {hapPage} / {totalHapPages}
            </span>
            <button
              onClick={() => onHapPageChange?.(Math.min(totalHapPages, hapPage + 1))}
              disabled={hapPage === totalHapPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

};

export default GeneTable;