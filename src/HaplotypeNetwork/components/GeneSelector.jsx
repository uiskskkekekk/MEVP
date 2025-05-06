// GeneSelector.jsx
import React, { useState } from "react";
import { FixedSizeList as List } from "react-window";

const GeneSelector = ({
  genes,                    // 所有基因清單
  selectedGene,            // 當前選取的基因名稱
  setSelectedGene,         // 設定選取基因
  showAllGenes,            // 顯示所有基因（地圖用）
  showSpecificGene,        // 顯示特定基因（未使用，可移除）
  geneColors,              // 基因對應顏色
  setActiveSimilarityGroup, // 設定目前相似基因群組
  onSimilarityResults,     // 比對完成後的回呼函式
}) => {
  // UI 狀態管理
  const [currentPage, setCurrentPage] = useState(0);         // 基因列表目前頁數
  const [customMin, setCustomMin] = useState(95);            // 自訂最小相似度
  const [customMax, setCustomMax] = useState(100);           // 自訂最大相似度
  const [progress, setProgress] = useState(null);            // 比對進度
  const [results, setResults] = useState([]);                // 比對結果
  const [resultsPage, setResultsPage] = useState(0);         // 結果頁數

  // 分頁相關常數
  const pageSize = 15;
  const totalPages = Math.ceil(genes.length / pageSize);
  const currentGenes = genes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const resultsPerPage = 100;
  const resultsTotalPages = Math.ceil(results.length / resultsPerPage);
  const currentResults = results.slice(resultsPage * resultsPerPage, (resultsPage + 1) * resultsPerPage);

  // 重設選取與比對狀態
  const resetSelection = () => {
    setSelectedGene(null);
    setResults([]);
    setResultsPage(0);
    setActiveSimilarityGroup([]);
    setProgress(null);
  };

  // 選擇或取消選擇基因
  const handleSelect = (geneName) => {
    const isSameGene = selectedGene === geneName;
    resetSelection();
    isSameGene ? showAllGenes() : setSelectedGene(geneName);
  };

  // 基因列表翻頁
  const handlePageChange = (dir) => {
    setCurrentPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, totalPages - 1)
    );
  };

  // 結果頁面翻頁
  const handleResultsPageChange = (dir) => {
    setResultsPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, resultsTotalPages - 1)
    );
  };

  // 相似度篩選與比對請求
  const filterBySimilarity = async (min, max) => {
    if (!selectedGene) return;

    setProgress({ completed: 0, total: 0 });
    setResults([]);
    setResultsPage(0);
    setActiveSimilarityGroup([]);

    try {
      const res = await fetch("http://localhost:3000/sequences");
      const { sequences } = await res.json();

      const response = await fetch("http://localhost:3000/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetName: selectedGene, sequences }),
      });

      if (!response.ok) throw new Error("比對請求失敗");

      const data = await response.json();

      // 篩選與排序比對結果
      const filtered = data
        .filter(({ similarity }) => similarity >= min && similarity <= max)
        .sort((a, b) => b.similarity - a.similarity);

      setResults(filtered);
      setResultsPage(0);
      setActiveSimilarityGroup(filtered.map((g) => g.name));
      onSimilarityResults?.(filtered.map((g) => g.name));
      setProgress(null);
    } catch (err) {
      console.error("比對錯誤:", err);
      setProgress(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
      {/* 基因選單區塊 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: "220px" }}>
        <button onClick={() => { resetSelection(); showAllGenes(); }}>
          Select genes
        </button>

        {currentGenes.map((gene) => (
          <button
            key={gene.name}
            onClick={() => handleSelect(gene.name)}
            style={{
              backgroundColor: selectedGene === gene.name ? "#cde" : geneColors[gene.name] || "#fff",
              color: "#000",
              border: "1px solid #aaa",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {gene.name}
          </button>
        ))}

        {/* 頁面控制 */}
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "10px" }}>
          <button onClick={() => handlePageChange("prev")} disabled={currentPage === 0}>
            上一頁
          </button>
          <span>第 {currentPage + 1} 頁 / 共 {totalPages} 頁</span>
          <button onClick={() => handlePageChange("next")} disabled={currentPage === totalPages - 1}>
            下一頁
          </button>
        </div>
      </div>

      {/* 相似度與結果區塊 */}
      <div style={{ flex: 1 }}>
        <strong>比對相似基因：</strong>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "5px" }}>
          <button onClick={() => filterBySimilarity(100, 100)}>100% 相似</button>
          <button onClick={() => filterBySimilarity(90, 99.99)}>90%~99%</button>
          <button onClick={() => filterBySimilarity(80, 89.99)}>80%~89%</button>
        </div>

        {/* 自訂相似度區間 */}
        <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
          <span>自訂相似度範圍：</span>
          <input
            type="number"
            min={0}
            max={100}
            value={customMin}
            onChange={(e) => setCustomMin(Number(e.target.value))}
            style={{ width: "60px" }}
          />
          <span>~</span>
          <input
            type="number"
            min={0}
            max={100}
            value={customMax}
            onChange={(e) => setCustomMax(Number(e.target.value))}
            style={{ width: "60px" }}
          />
          <button
            onClick={() => {
              if (customMin <= customMax) {
                filterBySimilarity(customMin, customMax);
              } else {
                alert("請確認相似度範圍有效（最小 <= 最大）");
              }
            }}
          >
            查詢
          </button>
        </div>

        {/* 處理中提示 */}
        {progress && (
          <p style={{ marginTop: "10px", color: "blue" }}>
            正在比對中...
          </p>
        )}

        {/* 顯示比對結果 */}
        {results.length > 0 && (
          <div style={{ marginTop: "10px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <strong>比對結果：</strong>
            <List height={400} width={400} itemCount={currentResults.length} itemSize={35}>
              {({ index, style }) => {
                const { name, similarity } = currentResults[index];
                return (
                  <div key={name} style={style}>
                    <span style={{ color: geneColors[name] || "#000" }}>{name}</span> — {similarity.toFixed(1)}%
                  </div>
                );
              }}
            </List>

            {/* 結果翻頁 */}
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => handleResultsPageChange("prev")} disabled={resultsPage === 0}>
                上一頁
              </button>
              <span>第 {resultsPage + 1} 頁 / 共 {resultsTotalPages} 頁</span>
              <button
                onClick={() => handleResultsPageChange("next")}
                disabled={resultsPage >= resultsTotalPages - 1}
              >
                下一頁
              </button>
            </div>
          </div>
        )}

        {/* 無比對結果提示 */}
        {results.length === 0 && selectedGene && progress === null && (
          <div style={{ marginTop: "10px", color: "gray" }}>
            無相似基因
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneSelector;
