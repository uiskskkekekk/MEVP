// GeneTable.jsx
// 顯示並編輯基因在不同城市的出現數量，用於與地圖配合視覺化

import React, { useEffect, useMemo, useState } from "react";
import "../components/AppStyles.css";

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

  const locations = [
    "Taipei", "New Taipei", "Keelung", "Taoyuan", "Hsinchu", "Miaoli", "Taichung",
    "Changhua", "Nantou", "Yunlin", "Chiayi", "Tainan", "Kaohsiung", "Pingtung",
    "Hualien", "Taitung", "Yilan",
  ];

  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);

  // 自動偵測基因名稱中含有地名並補上預設 count
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

  // 建立每個城市的基因清單，提供給地圖使用
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

  // 編輯 count 數值後立即觸發更新
  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneName, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (setCurrentPage) setCurrentPage(1);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split("\n");
      const updates = {};

      lines.forEach((line) => {
        const [geneName, city, countStr] = line.trim().split(",");
        const count = parseInt(countStr, 10);
        if (!geneName || !city || isNaN(count)) return;

        if (!updates[geneName]) updates[geneName] = {};
        updates[geneName][city] = count;
      });

      const updatedGenes = genes.map((gene) => {
        if (updates[gene.name]) {
          return {
            ...gene,
            counts: {
              ...gene.counts,
              ...updates[gene.name],
            },
          };
        }
        return gene;
      });

      onEditGeneCountBulk(updatedGenes);
      updateMapData(locations);
    };

    reader.readAsText(file);
  };

  // 搜尋與勾選過濾邏輯
  const filteredGenes = useMemo(() => {
    let result = genes.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (showOnlySelected) {
      result = result.filter((g) => selectedGenesSet.has(g.name));
    }
    return result;
  }, [genes, searchTerm, showOnlySelected, selectedGenesSet]);

  // 分頁邏輯
  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredGenes.slice(startIdx, endIdx);
  }, [filteredGenes, currentPage, itemsPerPage]);

  // 勾選切換邏輯
  const toggleGeneSelection = (geneName) => {
    const newSelectedGenes = selectedGenesSet.has(geneName)
      ? externalSelectedGenes.filter((name) => name !== geneName)
      : [...externalSelectedGenes, geneName];

    onSelectedGenesChange?.(newSelectedGenes);
  };

  return (
    <div style={{ overflowX: "auto", padding: "10px" }}>
      <h2>基因數據表</h2>

      {/* 搜尋與檔案上傳控制區塊 */}
      <div className="flex" style={{ marginBottom: "15px", gap: "15px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
          style={{ width: 220 }}
        />
        <input type="file" accept=".txt" onChange={handleFileUpload} style={{ fontSize: "14px" }} />
        <label style={{ marginLeft: "auto", userSelect: "none", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={() => {
              setShowOnlySelected((prev) => {
                const next = !prev;
                if (next && setCurrentPage) setCurrentPage(1);
                return next;
              });
            }}
            style={{ marginRight: "6px" }}
          />
          只顯示已勾選的基因
        </label>
      </div>

      {/* 表格區域 */}
      <table className="gene-table">
        <thead>
          <tr>
            <th style={{ width: "50px" }}></th>
            <th style={{ minWidth: "180px", textAlign: "left" }}>基因</th>
            {locations.map((loc) => (
              <th key={loc} style={{ width: "80px", whiteSpace: "nowrap" }}>{loc}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedGenes.length > 0 ? (
            paginatedGenes.map((gene) => (
              <tr key={gene.name}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedGenesSet.has(gene.name)}
                    onChange={() => toggleGeneSelection(gene.name)}
                  />
                </td>
                <td style={{ textAlign: "left" }}>
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
            ))
          ) : (
            <tr>
              <td colSpan={locations.length + 2} style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                無基因數據
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GeneTable;
