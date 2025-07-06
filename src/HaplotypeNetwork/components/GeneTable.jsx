import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import "../components/AppStyles.css";
import { riverToCityMap } from "../data/riverToCityMap";

const GeneTable = ({
  genes,
  currentPage,
  itemsPerPage,
  updateMapData,
  geneColors,
  setCityGeneData,
  onEditGeneCount,
  setCurrentPage,
  onEditGeneCountBulk,
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [viewMode, setViewMode] = useState("count");
  const [ednaMapping, setEdnaMapping] = useState({});
  const [tagMapping, setTagMapping] = useState({});

  const locations = [
    "Taipei", "New Taipei", "Keelung", "Taoyuan", "Hsinchu", "Miaoli", "Taichung",
    "Changhua", "Nantou", "Yunlin", "Chiayi", "Tainan", "Kaohsiung", "Pingtung",
    "Hualien", "Taitung", "Yilan",
  ];

  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);

  useEffect(() => {
    const updatedGenes = genes.map((gene) => {
      const newCounts = { ...gene.counts };
      let modified = false;

      locations.forEach((loc) => {
        if (gene.name.toLowerCase().includes(loc.toLowerCase()) && !newCounts[loc]) {
          newCounts[loc] = 1;
          modified = true;
        }
      });

      const riverKeywords = ["基隆河", "淡水河", "新店溪", "景美溪"];
      if (riverKeywords.some((kw) => gene.name.includes(kw)) && !newCounts["Taipei"]) {
        newCounts["Taipei"] = 1;
        modified = true;
      }

      return modified ? { ...gene, counts: newCounts } : gene;
    });

    const hasChanges = updatedGenes.some((gene, idx) => gene !== genes[idx]);
    if (hasChanges) onEditGeneCountBulk(updatedGenes);
  }, [genes]);

  useEffect(() => {
    const cityMap = {};
    locations.forEach((loc) => (cityMap[loc] = []));

    genes.forEach((gene) => {
      locations.forEach((loc) => {
        const count = gene.counts?.[loc] || 0;
        if (count > 0) {
          cityMap[loc].push({
            name: gene.name,
            color: geneColors[gene.name] || "#000",
            value: count,
          });
        }
      });
    });

    setCityGeneData(cityMap);
  }, [genes, geneColors, setCityGeneData]);

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

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (type === "edna") {
        const mapping = {};
        json.forEach((row) => {
          const id = String(row["eDNA_ID"]).trim();
          mapping[id] = {
            river: row["河川"] || "無資料",
            site: row["樣區"] || "無資料",
            Celong1: row["Celong1"] || "無資料",
            Celat2: row["Celat2"] || "無資料",
          };
        });
        setEdnaMapping(mapping);
      } else if (type === "tag") {
  const mapping = {};
  json.forEach((row) => {
    const id = String(row["sample_ID"]).trim();
    mapping[id] = {
      sampleId: row["sample_ID"] || "無資料",
      barcodeF: row["barcode-F(5'-3')"] || "無資料",
      primerF: row["primer-F(5'-3')"] || "無資料",
      barcodeR: row["barcode-R(5'-3')"] || "無資料",
      primerR: row["primer-R(5'-3')"] || "無資料",
    };
  });
  setTagMapping(mapping);
}

    };
    reader.readAsArrayBuffer(file);
  };

  const filteredGenes = useMemo(() => {
    let result = genes.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (showOnlySelected) {
      result = result.filter((g) => selectedGenesSet.has(g.name));
    }
    return result;
  }, [genes, searchTerm, showOnlySelected, selectedGenesSet]);

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
    <div style={{ overflowX: "auto", padding: "10px" }}>
      <h2>基因數據表</h2>

      {/* 切換視圖 */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setViewMode("count")} style={{ marginRight: "8px" }}>
          數量表
        </button>
        <button onClick={() => setViewMode("detail")}>詳細資料表</button>
      </div>

      {/* 控制列 */}
      <div className="flex" style={{ marginBottom: "15px", gap: "15px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
          style={{ width: 220 }}
        />
        <label>
          上傳 eDNA.xlsx
          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, "edna")} hidden />
        </label>
        <label>
          上傳 tags.xlsx
          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, "tag")} hidden />
        </label>
        <label style={{ marginLeft: "auto", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={() => setShowOnlySelected((prev) => {
              const next = !prev;
              if (next && setCurrentPage) setCurrentPage(1);
              return next;
            })}
            style={{ marginRight: "6px" }}
          />
          只顯示已勾選的基因
        </label>
      </div>

      {/* 數量表 */}
      {viewMode === "count" && (
        <table className="gene-table">
          <thead>
            <tr>
              <th></th>
              <th>基因</th>
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
                      style={{
                        width: "50px",
                        padding: "3px",
                        fontSize: "13px",
                        textAlign: "center",
                        borderRadius: "3px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 詳細資料表 */}
      {viewMode === "detail" && (
        <table className="gene-table">
          <thead>
            <tr>
              <th>基因名稱</th>
              <th>採樣點編號</th>
              <th>Forward Barcode</th>
              <th>Forward Primer</th>
              <th>Reverse Barcode</th>
              <th>Reverse Primer</th>
              <th>經度</th>
              <th>緯度</th>
              <th>河川</th>
              <th>樣區</th>
              <th>縣市</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGenes.map((gene) => {
              const parts = gene.name.split("_");
              const shortId = parts.length >= 2 ? parts[parts.length - 2] : null;
              const fullId = parts.length >= 3 ? parts.slice(-3, -1).join("_") : null;
              const info = ednaMapping[shortId];
              const tag = tagMapping[fullId];

              return (
                <tr key={gene.name}>
                  <td>
                    <span className="color-box" style={{ backgroundColor: geneColors[gene.name] || "black" }} />
                    {gene.name}
                  </td>
                  <td>{tag?.sampleId || "無資料"}</td>
                  <td>{tag?.barcodeF || "無資料"}</td>
                  <td>{tag?.primerF || "無資料"}</td>
                  <td>{tag?.barcodeR || "無資料"}</td>
                  <td>{tag?.primerR || "無資料"}</td>
                  <td>{info?.Celong1 || "無資料"}</td>
                  <td>{info?.Celat2 || "無資料"}</td>
                  <td>{info?.river || "無資料"}</td>
                  <td>{info?.site || "無資料"}</td>
                  <td>{info ? riverToCityMap[info.river] || "未知縣市" : "無資料"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GeneTable;
