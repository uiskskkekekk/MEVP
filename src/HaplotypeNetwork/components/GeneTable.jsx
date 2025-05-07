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
  onEditGeneCountBulk
}) => {
  const [searchTerm, setSearchTerm] = useState(""); // 用於搜尋基因名稱

  // 預設的城市列表
  const locations = [
    "Taipei", "New Taipei", "Keelung", "Taoyuan", "Hsinchu", "Miaoli", "Taichung",
    "Changhua", "Nantou", "Yunlin", "Chiayi", "Tainan", "Kaohsiung", "Pingtung",
    "Hualien", "Taitung", "Yilan",
  ];

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
  
      return modified ? { ...gene, counts: newCounts } : gene;
    });
  
    const hasChanges = updatedGenes.some((gene, idx) =>
      gene !== genes[idx]
    );
  
    if (hasChanges) {
      console.log(`[自動偵測] 共更新 ${updatedGenes.filter((g, i) => g !== genes[i]).length} 筆基因資料`);
      onEditGeneCountBulk(updatedGenes);
    }
  }, [genes]);
  

  // 過濾基因資料，依照搜尋條件
  const filteredGenes = useMemo(() => {
    return genes.filter((gene) =>
      gene.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genes, searchTerm]);

  // 分頁處理過濾後的基因資料
  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredGenes.slice(startIdx, endIdx);
  }, [filteredGenes, currentPage, itemsPerPage]);

  // 更新城市基因數據，並傳遞給父組件
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

    // 傳遞更新後的城市基因數據
    setCityGeneData(cityMap);
  }, [genes, geneColors, setCityGeneData]);

  // 處理單個基因數據的修改
  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0); // 保證 count 不小於 0
    onEditGeneCount(geneName, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0); // 延遲更新地圖數據
  };

  // 處理搜尋框的變更
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (setCurrentPage) {
      setCurrentPage(1); // 搜尋時，重置到第 1 頁
    }
  };

  // 處理檔案上傳
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split("\n");
      const updates = {}; // { geneName: { city: count, ... } }

      // 解析檔案並建立更新資料
      lines.forEach((line) => {
        const [geneName, city, countStr] = line.trim().split(",");
        const count = parseInt(countStr, 10);
        if (!geneName || !city || isNaN(count)) return;

        if (!updates[geneName]) updates[geneName] = {};
        updates[geneName][city] = count;
      });

      // 更新基因資料
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

      // 批量更新基因數據
      onEditGeneCountBulk(updatedGenes);
      updateMapData(locations); // 更新地圖數據
    };

    reader.readAsText(file); // 讀取檔案
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <h2>基因數據表</h2>

      {/* 搜尋框和文件上傳功能 */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: "5px", width: "200px", marginRight: "10px" }}
        />
        <input type="file" accept=".txt" onChange={handleFileUpload} />
      </div>

      {/* 顯示基因數據的表格 */}
      <table border="1" style={{ tableLayout: "auto", width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ minWidth: "180px", textAlign: "left", whiteSpace: "normal" }}>基因</th>
            {locations.map((loc) => (
              <th key={loc} style={{ width: "80px", textAlign: "center" }}>
                {loc}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedGenes.length > 0 ? (
            paginatedGenes.map((gene) => (
              <tr key={gene.name}>
                {/* 基因名稱欄位 */}
                <td
                  style={{
                    minWidth: "180px",
                    textAlign: "left",
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                  }}
                >
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

                {/* 各城市基因數量欄位 */}
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
              <td colSpan={locations.length + 1} style={{ textAlign: "center" }}>
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
