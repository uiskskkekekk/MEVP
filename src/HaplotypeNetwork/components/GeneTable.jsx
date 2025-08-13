import React, { useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import "../components/GeneTable.css";
import { riverToCityMap } from "../data/riverToCityMap";

const GeneTable = ({
  genes,
  currentPage,
  itemsPerPage,
  updateMapData,
  geneColors,
  onViewModeChange, // ✅ 新增
  onHapColorsChange, // ✅ 新增

  setCityGeneData,

  setTotalCityGeneData, // ✅ 新增


  onEditGeneCount,
  setCurrentPage,
  onEditGeneCountBulk,
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
  eDnaSampleContent,
  eDnaTagsContent,
   fileName,                     // ✅ 加這行
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [viewMode, setViewMode] = useState("count");
  const [ednaMapping, setEdnaMapping] = useState({});
  const [tagMapping, setTagMapping] = useState({});
  const [locations, setLocations] = useState([]);
  const [totalTableData, setTotalTableData] = useState([]);

  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);
  const [hapPage, setHapPage] = useState(1);
  const HAPS_PER_PAGE = 10;

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


const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`);

const [hapColors, setHapColors] = useState({});

const [showPercentage, setShowPercentage] = useState(false);
const [speciesOptions, setSpeciesOptions] = useState([]);
const [currentSpecies, setCurrentSpecies] = useState("");


const [totalFileName, setTotalFileName] = useState("");




  const convertLatLonToXY = (lat, lon) => {
    const mapWidth = 465;
    const mapHeight = 658.5;
    const minLon = 120;
    const maxLon = 122;
    const minLat = 22;
    const maxLat = 25.4;
    const cx = ((lon - minLon) / (maxLon - minLon)) * mapWidth;
    const cy = ((maxLat - lat) / (maxLat - minLat)) * mapHeight;
    return { cx, cy };
  };

useEffect(() => {
  onViewModeChange?.(viewMode);
}, [viewMode]);

 useEffect(() => {
  if (viewMode === "total" && hapHeaders.length > 0) {
    const colors = generateColors(hapHeaders.length);
    const mapping = {};
    hapHeaders.forEach((hap, idx) => {
      mapping[hap] = colors[idx];
    });

    const isSame =
      Object.keys(mapping).length === Object.keys(hapColors).length &&
      Object.keys(mapping).every((key) => mapping[key] === hapColors[key]);

    if (!isSame) {
      setHapColors(mapping);
      onHapColorsChange?.(mapping); // ✅ 新增這行
    }
  }
}, [hapHeaders, viewMode]);



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

useEffect(() => {
    let locList = [];

if (viewMode === "total" && totalTableData.length > 1) {
  const rows = totalTableData.slice(1);
  locList = rows.map((row) => row[0]); // 從 csv 的第一欄抓地名
} else {
  locList = locations;
}

const cityMap = {};
locList.forEach((loc) => {
  const edna = ednaMapping[loc] || {};
  let cx = null,
    cy = null;
  if (!isNaN(parseFloat(edna.Celong1)) && !isNaN(parseFloat(edna.Celat2))) {
    const result = convertLatLonToXY(parseFloat(edna.Celat2), parseFloat(edna.Celong1));
    cx = result.cx;
    cy = result.cy;
  }
  cityMap[loc] = {
    coordinates: { cx, cy },
    genes: [],
  };
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


      setTotalCityGeneData?.(cityMap); // ✅ 使用 setTotalCityGeneData
    } else {
      genes.forEach((gene) => {
        locations.forEach((loc) => {
          const count = gene.counts?.[loc] || 0;
          if (count > 0) {
            cityMap[loc].genes.push({
              name: gene.name,
              color: geneColors[gene.name] || "#000",
              value: count,
            });
          }
        });
      });

      setCityGeneData?.(cityMap); // ✅ 使用 setCityGeneData
    }
  }, [viewMode, totalTableData, hapColors, genes, geneColors, locations, ednaMapping  , filterMode]);



  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneName, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

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

  if (type === "total") {
    reader.readAsText(file);
  }
};

useEffect(() => {
  if (eDnaSampleContent && eDnaSampleContent.length > 0) {
    const mapping = {};
    const ids = new Set();

    eDnaSampleContent.forEach((row) => {
      const id = String(row["eDNA_ID"]).trim();
      if (id) {
        ids.add(id);
        mapping[id] = {
          river: row["river"] || "No information",
          site: row["sample area"] || "No information",
          Celong1: row["Celong1"] || "No information",
          Celat2: row["Celat2"] || "No information",
        };
      }
    });

    setEdnaMapping(mapping);
    setLocations(Array.from(ids));
  }
}, [eDnaSampleContent]);

useEffect(() => {
    if (eDnaTagsContent && eDnaTagsContent.length > 0) {
      const speciesSet = new Set();
      const mapping = {};
      eDnaTagsContent.forEach((row) => {
        const id = String(row["sample_ID"]).trim();
        const prefix = id.split("_")[0];
        if (prefix) speciesSet.add(prefix);
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
    }
  }, [eDnaTagsContent]);


   useEffect(() => {
    if (fileName && speciesOptions.length > 0) {
      const match = speciesOptions.find((species) => fileName.startsWith(species));
      if (match) setCurrentSpecies(match);
    }
  }, [fileName, speciesOptions]);



const filteredGenes = useMemo(() => {
  let result = genes.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewMode === "detail" && currentSpecies) {
    // ✅ 物種過濾：基因名稱含有當前物種 或者 檔名屬於當前物種
    result = result.filter((g) => {
      const nameParts = g.name.split("_");
      return (
        nameParts.includes(currentSpecies) ||
        (fileName && fileName.startsWith(currentSpecies))
      );
    });
  }

  if (showOnlySelected) {
    result = result.filter((g) => selectedGenesSet.has(g.name));
  }

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



const getSampleInfo = (geneName) => {
  let sampleId = null;

  // ✅ 先嘗試從 geneName 中找物種與地點 (例如 f_2066_ZpDL_HL_R2f → ZpDL_HL)
  const match = geneName.match(/(ZpDL|CypDL|xworm)_[A-Za-z0-9-]+/);
  if (match) {
    sampleId = match[0];
  }

  // ✅ 如果 geneName 沒有帶物種，則根據 fileName 來推測
  if (!sampleId && fileName) {
    const speciesPrefix = speciesOptions.find((prefix) =>
      fileName.startsWith(prefix)
    );
    const nameParts = geneName.split("_");
    if (speciesPrefix && nameParts.length > 0) {
      sampleId = `${speciesPrefix}_${nameParts[0]}`;
    }
  }

  // ✅ 即使 sampleId 對不到，也要讓基因顯示
  const tag = sampleId ? tagMapping[sampleId] : null;
  const shortId = sampleId?.split("_").slice(-1)[0]; // 抓最後的地點碼
  const info = shortId ? ednaMapping[shortId] : null;

  return { sampleId, tag, info };
};


  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredGenes.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredGenes, currentPage, itemsPerPage]);

  const toggleGeneSelection = (geneName) => {
    const newSelectedGenes = selectedGenesSet.has(geneName)
      ? externalSelectedGenes.filter((name) => name !== geneName)
      : [...externalSelectedGenes, geneName];
    onSelectedGenesChange?.(newSelectedGenes);
  };




  return (
    <div style={{ overflowX: "auto", padding: "0px" }}>
      <h2>Gene information table</h2>

      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setViewMode("count")} style={{ marginRight: "8px" }}>Quantity table</button>
        <button onClick={() => setViewMode("detail")} style={{ marginRight: "8px" }}>information table</button>
        <button onClick={() => setViewMode("total")}>total table</button>
      </div>

      <div className="flex" style={{ marginBottom: "15px", gap: "15px", alignItems: "center" }}>
        {/* 搜尋框 */}
<input
  type="text"
  placeholder="Search"
  value={searchTerm}
  onChange={handleSearchChange}
  className="search-input"
  style={{ width: 220 }}
/>

{/* 檔案上傳區域，讓 input 一直存在，但文字依 viewMode 顯示 */}
<label>
  {viewMode === "total" && (
  <>
    <label>
      uploads CSV
      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFileUpload(e, "total")}
        hidden
      />
    </label>
    {totalFileName && (
      <span style={{ color: "green", marginLeft: "6px" }}>✔ {totalFileName}</span>
    )}
  </>
)}

</label>






{/* 篩選大於1%按鈕 */}
{viewMode === "total" && (
  <div style={{ marginBottom: "10px" }}>
    <button onClick={() => setFilterMode("all")}>Show all</button>
    <button onClick={() => setFilterMode("over1percent")}>Show only ≥ 1%</button>
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

      {viewMode === "count" && (
        <div className="gene-table-container view-count">
          <div className="gene-table-wrapper">
            <table className="gene-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Gene name</th>
                  {locations.map((loc) => (
                    <th key={loc}>{loc}</th>
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
                      <span className="color-box" style={{ backgroundColor: geneColors[gene.name] || "black" }} />
                      {gene.name}
                    </td>
                    {locations.map((loc) => (
                      <td key={`${gene.name}-${loc}`}>
                        <input
                          type="number"
                          min="0"
                          value={gene.counts?.[loc] || 0}
                          onChange={(e) => handleEditGeneCount(gene.name, loc, e.target.value)}
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

      {viewMode === "detail" && (
<>
        {/* ✅ 物種切換區塊 */}
    {speciesOptions.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <b>Species:</b>
        {speciesOptions.map((s) => (
          <button
            key={s}
            onClick={() => setCurrentSpecies(s)}
            style={{
              marginLeft: 10,
              backgroundColor: currentSpecies === s ? "#007bff" : "#e0e0e0",
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
  const { sampleId, tag, info } = getSampleInfo(gene.name);


                  return (
                    <tr key={gene.name}>
                      <td>
                        <span className="color-box" style={{ backgroundColor: geneColors[gene.name] || "black" }} />
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
                      <td>{info ? riverToCityMap[info.river] || "No information" : "No information"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}



      {viewMode === "total" && totalTableData.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  total Table
  <button onClick={() => setShowPercentage((prev) => !prev)}>
    {showPercentage ? "Display value" : "Show percentage"}
  </button>
</h3>

          <div style={{ marginBottom: "10px" }}>
            <button onClick={() => setHapPage((p) => Math.max(1, p - 1))} disabled={hapPage === 1}>上一頁</button>
            <span style={{ margin: "0 10px" }}> {hapPage} /  {totalHapPages} </span>
            <button onClick={() => setHapPage((p) => Math.min(totalHapPages, p + 1))} disabled={hapPage === totalHapPages}>下一頁</button>
          </div>
          <div className="gene-table-container view-total">
            <div className="gene-table-wrapper">
              <table className="gene-table">
                <thead>
  <tr>
    {displayedHeaders.map((header, idx) => (
      <th key={idx}>
        {header.startsWith("hap_") ? (
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                backgroundColor: hapColors[header] || "#000",
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
          const bgColor = isHapCol && rawValue === 0 ? "#fff" : undefined;

          return (
            <td key={colIndex} style={{ backgroundColor: bgColor, textAlign: "center" }}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneTable;