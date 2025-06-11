// GeneSelector.jsx
// 選擇特定基因並進行相似度比對，顯示相關比對結果

import React, { useState } from "react";
import { FixedSizeList as List } from "react-window";
import "../components/AppStyles.css";

const GeneSelector = ({
  genes,
  selectedGene,
  setSelectedGene,
  showAllGenes,
  geneColors,
  setActiveSimilarityGroup,
  onSimilarityResults,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [customMin, setCustomMin] = useState(95);
  const [customMax, setCustomMax] = useState(100);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsPage, setResultsPage] = useState(0);

  // 分頁設定
  const pageSize = 15;
  const totalPages = Math.ceil(genes.length / pageSize);
  const currentGenes = genes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const resultsPerPage = 100;
  const resultsTotalPages = Math.ceil(results.length / resultsPerPage);
  const currentResults = results.slice(resultsPage * resultsPerPage, (resultsPage + 1) * resultsPerPage);

  const resetSelection = () => {
    setSelectedGene(null);
    setResults([]);
    setResultsPage(0);
    setActiveSimilarityGroup([]);
    setProgress(null);
  };

  const handleSelect = (geneName) => {
    const isSameGene = selectedGene === geneName;
    resetSelection();
    isSameGene ? showAllGenes() : setSelectedGene(geneName);
  };

  const handlePageChange = (dir) => {
    setCurrentPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, totalPages - 1)
    );
  };

  const handleResultsPageChange = (dir) => {
    setResultsPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, resultsTotalPages - 1)
    );
  };

  // 發送比對請求
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
    <div className="flex flex-gap-20 align-start">
      {/* 左側：基因列表區域 */}
      <div className="flex flex-column flex-gap-5" style={{ minWidth: "220px" }}>
        <button className="button" onClick={() => { resetSelection(); showAllGenes(); }}>
          Select genes
        </button>

        {currentGenes.map((gene) => (
          <button
            key={gene.name}
            onClick={() => handleSelect(gene.name)}
            className="button"
            style={{
              backgroundColor: selectedGene === gene.name ? "#cde" : geneColors[gene.name] || "#fff",
              border: "1px solid #aaa",
              padding: "4px 10px",
              color: "#000",
              cursor: "pointer",
            }}
          >
            {gene.name}
          </button>
        ))}

        <div className="pagination-controls">
          <button onClick={() => handlePageChange("prev")} disabled={currentPage === 0}>上一頁</button>
          <span>第 {currentPage + 1} 頁 / 共 {totalPages} 頁</span>
          <button onClick={() => handlePageChange("next")} disabled={currentPage === totalPages - 1}>下一頁</button>
        </div>
      </div>

      {/* 右側：比對功能與結果區域 */}
      <div className="flex-column flex-gap-10" style={{ flex: 1 }}>
        <strong>比對相似基因：</strong>

        {/* 常用範圍按鈕 */}
        <div className="button-group">
          <button onClick={() => filterBySimilarity(100, 100)}>100% 相似</button>
          <button onClick={() => filterBySimilarity(90, 99.99)}>90%~99%</button>
          <button onClick={() => filterBySimilarity(80, 89.99)}>80%~89%</button>
        </div>

        {/* 自訂範圍設定 */}
        <div className="flex flex-gap-10 align-center">
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

        {progress && (
          <p style={{ marginTop: "10px", color: "blue" }}>正在比對中...</p>
        )}

        {/* 比對結果顯示 */}
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
            <div className="pagination-controls">
              <button onClick={() => handleResultsPageChange("prev")} disabled={resultsPage === 0}>上一頁</button>
              <span>第 {resultsPage + 1} 頁 / 共 {resultsTotalPages} 頁</span>
              <button
                onClick={() => handleResultsPageChange("next")}
                disabled={resultsPage >= resultsTotalPages - 1}
              >下一頁</button>
            </div>
          </div>
        )}

        {/* 無結果顯示 */}
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