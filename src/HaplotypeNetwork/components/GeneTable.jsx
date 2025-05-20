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
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
}) => {
  // 搜尋文字狀態
  const [searchTerm, setSearchTerm] = useState("");
  // 是否只顯示已勾選基因
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // 城市清單（table 欄位）
  const locations = [
    "Taipei", "New Taipei", "Keelung", "Taoyuan", "Hsinchu", "Miaoli", "Taichung",
    "Changhua", "Nantou", "Yunlin", "Chiayi", "Tainan", "Kaohsiung", "Pingtung",
    "Hualien", "Taitung", "Yilan",
  ];

  // 將外部傳入已選基因陣列轉成 Set 方便判斷是否已選
  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);

  // useEffect：自動偵測基因名稱中包含地名，若 counts 沒該地點則新增 count=1
  useEffect(() => {
    const updatedGenes = genes.map((gene) => {
      const newCounts = { ...gene.counts };
      let modified = false;

      // 偵測基因名稱包含城市名，新增對應城市 count=1
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

      // 特殊河流名包含時，新增 Taipei count=1
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

    // 判斷是否有更新，若有呼叫 onEditGeneCountBulk 更新整批基因資料
    const hasChanges = updatedGenes.some((gene, idx) => gene !== genes[idx]);
    if (hasChanges) {
      console.log(`[自動偵測] 共更新 ${updatedGenes.filter((g, i) => g !== genes[i]).length} 筆基因資料`);
      onEditGeneCountBulk(updatedGenes);
    }
  }, [genes]);

  // useEffect：更新 cityGeneData 用於地圖視覺化
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

  // 處理編輯特定基因某地點 count
  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneName, location, updatedCount);
    // 延遲呼叫更新地圖資料，避免卡頓
    setTimeout(() => updateMapData([location]), 0);
  };

  // 搜尋欄位變動事件
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (setCurrentPage) {
      setCurrentPage(1); // 搜尋時跳回第1頁
    }
  };

  // 處理檔案上傳更新基因資料
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split("\n");
      const updates = {};

      // 解析檔案每行：格式為 geneName,city,count
      lines.forEach((line) => {
        const [geneName, city, countStr] = line.trim().split(",");
        const count = parseInt(countStr, 10);
        if (!geneName || !city || isNaN(count)) return;

        if (!updates[geneName]) updates[geneName] = {};
        updates[geneName][city] = count;
      });

      // 建立新的基因列表並更新 counts
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

  // 篩選基因：先搜尋，再判斷是否只顯示已勾選基因
  const filteredGenes = useMemo(() => {
    let result = genes.filter((gene) =>
      gene.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showOnlySelected) {
      result = result.filter((gene) => selectedGenesSet.has(gene.name));
    }

    return result;
  }, [genes, searchTerm, showOnlySelected, selectedGenesSet]);

  // 分頁顯示基因列表
  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredGenes.slice(startIdx, endIdx);
  }, [filteredGenes, currentPage, itemsPerPage]);

  // 切換基因勾選狀態
  const toggleGeneSelection = (geneName) => {
    let newSelectedGenes;
    if (selectedGenesSet.has(geneName)) {
      // 已選中則移除
      newSelectedGenes = externalSelectedGenes.filter((name) => name !== geneName);
    } else {
      // 未選中則新增
      newSelectedGenes = [...externalSelectedGenes, geneName];
    }
    if (onSelectedGenesChange) {
      onSelectedGenesChange(newSelectedGenes);
    }
  };

  return (
    <div style={{ overflowX: "auto", padding: "10px" }}>
      <h2>基因數據表</h2>

      {/* 搜尋與檔案上傳區塊 */}
      <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "15px" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            padding: "6px 10px",
            width: "220px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />
        <input type="file" accept=".txt" onChange={handleFileUpload} style={{ fontSize: "14px" }} />

        <label style={{ marginLeft: "auto", userSelect: "none", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={() => setShowOnlySelected(!showOnlySelected)}
            style={{ marginRight: "6px" }}
          />
          只顯示已勾選的基因
        </label>
      </div>

      {/* 基因表格 */}
      <table
        border="1"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto",
          fontSize: "14px",
        }}
      >
        <thead style={{ backgroundColor: "#f5f5f5" }}>
          <tr>
            <th style={{ width: "50px" }}></th>
            <th style={{ minWidth: "180px", textAlign: "left", padding: "6px 10px" }}>基因</th>
            {locations.map((loc) => (
              <th
                key={loc}
                style={{
                  width: "80px",
                  textAlign: "center",
                  padding: "6px 5px",
                  whiteSpace: "nowrap",
                }}
              >
                {loc}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {paginatedGenes.length > 0 ? (
            paginatedGenes.map((gene) => (
              <tr key={gene.name} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ textAlign: "center", padding: "6px" }}>
                  <input
                    type="checkbox"
                    checked={selectedGenesSet.has(gene.name)}
                    onChange={() => toggleGeneSelection(gene.name)}
                    aria-label={`選擇基因 ${gene.name}`}
                  />
                </td>
                <td style={{ minWidth: "180px", textAlign: "left", padding: "6px 10px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      backgroundColor: geneColors[gene.name] || "black",
                      marginRight: "8px",
                      verticalAlign: "middle",
                      borderRadius: "2px",
                    }}
                  />
                  {gene.name}
                </td>

                {/* 各城市 count 編輯欄位 */}
                {locations.map((loc) => (
                  <td
                    key={`${gene.name}-${loc}`}
                    style={{ width: "80px", textAlign: "center", padding: "4px 5px" }}
                  >
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
                      aria-label={`${gene.name} 在 ${loc} 的數量`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={locations.length + 2}
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
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
