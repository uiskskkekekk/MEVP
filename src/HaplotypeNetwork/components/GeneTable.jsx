import React, { useEffect, useMemo, useState } from "react";

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
  selectedGenes: externalSelectedGenes = [], // 從地圖來的選擇（預設空陣列）
  onSelectedGenesChange, // 父元件傳入的改變選擇的回調
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const locations = [
    "Taipei", "New Taipei", "Keelung", "Taoyuan", "Hsinchu", "Miaoli", "Taichung",
    "Changhua", "Nantou", "Yunlin", "Chiayi", "Tainan", "Kaohsiung", "Pingtung",
    "Hualien", "Taitung", "Yilan",
  ];

  // 把外部傳入的 selectedGenes 陣列轉成 Set，加速查詢
  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);

  useEffect(() => {
    const updatedGenes = genes.map((gene) => {
      const newCounts = { ...gene.counts };
      let modified = false;

      locations.forEach((loc) => {
        if (
          gene.name.toLowerCase().includes(loc.toLowerCase()) &&
          !newCounts[loc]
        ) {
          newCounts[loc] = 1;
          modified = true;
          console.log(`[自動偵測] 基因 "${gene.name}" 中含有地名 "${loc}"，已新增 count = 1`);
        }
      });

      const riverKeywords = ["基隆河", "淡水河", "新店溪", "景美溪"];
      if (
        riverKeywords.some((keyword) => gene.name.includes(keyword)) &&
        !newCounts["Taipei"]
      ) {
        newCounts["Taipei"] = 1;
        modified = true;
        console.log(`[自動偵測] 基因 "${gene.name}" 中含有台北河流名稱，已新增 Taipei count = 1`);
      }

      return modified ? { ...gene, counts: newCounts } : gene;
    });

    const hasChanges = updatedGenes.some((gene, idx) => gene !== genes[idx]);

    if (hasChanges) {
      console.log(`[自動偵測] 共更新 ${updatedGenes.filter((g, i) => g !== genes[i]).length} 筆基因資料`);
      onEditGeneCountBulk(updatedGenes);
    }
  }, [genes]);

  useEffect(() => {
    const cityMap = {};
    locations.forEach((loc) => {
      cityMap[loc] = [];
    });

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
    if (setCurrentPage) {
      setCurrentPage(1);
    }
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

  // 篩選基因（搜尋字串）
  const filteredGenes = useMemo(() => {
    return genes.filter((gene) =>
      gene.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genes, searchTerm]);

  // 分頁
  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredGenes.slice(startIdx, endIdx);
  }, [filteredGenes, currentPage, itemsPerPage]);

  // 只顯示已選擇基因時過濾
  const displayedGenes = useMemo(() => {
    if (showOnlySelected) {
      return paginatedGenes.filter((gene) => selectedGenesSet.has(gene.name));
    }
    return paginatedGenes;
  }, [paginatedGenes, selectedGenesSet, showOnlySelected]);

  // checkbox 點選切換事件
  const toggleGeneSelection = (geneName) => {
    let newSelectedGenes;
    if (selectedGenesSet.has(geneName)) {
      // 取消選擇
      newSelectedGenes = externalSelectedGenes.filter((name) => name !== geneName);
    } else {
      // 新增選擇
      newSelectedGenes = [...externalSelectedGenes, geneName];
    }
    if (onSelectedGenesChange) {
      onSelectedGenesChange(newSelectedGenes);
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <h2>基因數據表</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: "5px", width: "200px", marginRight: "10px" }}
        />
        <input type="file" accept=".txt" onChange={handleFileUpload} />

        <div style={{ marginTop: "10px" }}>
          <label>
            <input
              type="checkbox"
              checked={showOnlySelected}
              onChange={() => setShowOnlySelected(!showOnlySelected)}
              style={{ marginRight: "5px" }}
            />
            只顯示已勾選的基因
          </label>
        </div>
      </div>

      <table border="1" style={{ tableLayout: "auto", width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ width: "50px" }}></th>
            <th style={{ minWidth: "180px", textAlign: "left" }}>基因</th>
            {locations.map((loc) => (
              <th key={loc} style={{ width: "80px", textAlign: "center" }}>{loc}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayedGenes.length > 0 ? (
            displayedGenes.map((gene) => (
              <tr key={gene.name}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedGenesSet.has(gene.name)}
                    onChange={() => toggleGeneSelection(gene.name)}
                  />
                </td>
                <td style={{ minWidth: "180px", textAlign: "left" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      backgroundColor: geneColors[gene.name] || "black",
                      marginRight: "5px",
                    }}
                  ></span>
                  {gene.name}
                </td>
                {locations.map((loc) => (
                  <td key={`${gene.name}-${loc}`} style={{ width: "80px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="0"
                      value={gene.counts?.[loc] || 0}
                      onChange={(e) => handleEditGeneCount(gene.name, loc, e.target.value)}
                      style={{ width: "50px", textAlign: "center" }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={locations.length + 2} style={{ textAlign: "center" }}>
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
