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
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query

  // Filter genes based on search query
  const filteredGenes = genes.filter((gene) =>
    gene.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 分頁設定
  const pageSize = 15;
  const totalPages = Math.ceil(filteredGenes.length / pageSize);
  const currentGenes = filteredGenes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

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
      <div className="flex flex-column flex-gap-5" style={{ minWidth: "220px" ,  marginRight: "10px" }}>
        <div
          className="gene-selector-header"
          onClick={() => { resetSelection(); showAllGenes(); }}
          style={{ cursor: 'pointer', color: 'blue' }}
        >
          Select genes
        </div>

        {/* 搜尋框 */}
        <input
          type="text"
          placeholder="Search genes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            marginBottom: "10px",
            padding: "5px",
            border: "1px solid #aaa",
            borderRadius: "4px",
            width: "100%",
          }}
        />

        {currentGenes.map((gene) => (
          <div
            key={gene.name}
            onClick={() => handleSelect(gene.name)}
            className="gene-list-item"
            style={{
              backgroundColor: selectedGene === gene.name ? "#cde" : geneColors[gene.name] || "#fff",
              border: "1px solid #aaa",
              padding: "4px 10px",
              color: "#000",
              cursor: "pointer",
              borderRadius: "4px",
              margin: "2px 0",
            }}
          >
            {gene.name}
          </div>
        ))}

        <div className="pagination-controls">
          <button onClick={() => handlePageChange("prev")} disabled={currentPage === 0}>Previous page</button>
          <span>{currentPage + 1}  / {totalPages} </span>
          <button onClick={() => handlePageChange("next")} disabled={currentPage === totalPages - 1}>Next page</button>
        </div>
      </div>

      {/* 右側：比對功能與結果區域 */}
      <div className="flex-column flex-gap-10" style={{ flex: 1 }}>
        <strong>Comparison of similar genes：</strong>

        {/* 常用範圍按鈕 */}
        <div className="button-group">
          <button onClick={() => filterBySimilarity(100, 100)}>100% </button>
          <button onClick={() => filterBySimilarity(90, 99.99)}>90%~99%</button>
          <button onClick={() => filterBySimilarity(80, 89.99)}>80%~89%</button>
        </div>

        {/* 自訂範圍設定 */}
        <div className="flex flex-gap-10 align-center">
          <span>Range：</span>
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
            Search
          </button>
        </div>

        {progress && (
          <p style={{ marginTop: "10px", color: "blue" }}>Comparing...</p>
        )}

        {/* 比對結果顯示 */}
        {results.length > 0 && (
          <div style={{ marginTop: "10px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <strong>results：</strong>
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
              <button onClick={() => handleResultsPageChange("prev")} disabled={resultsPage === 0}>Previous page</button>
              <span> {resultsPage + 1}  /  {resultsTotalPages} </span>
              <button
                onClick={() => handleResultsPageChange("next")}
                disabled={resultsPage >= resultsTotalPages - 1}
              >Next page</button>
            </div>
          </div>
        )}

        {/* 無結果顯示 */}
        {results.length === 0 && selectedGene && progress === null && (
          <div style={{ marginTop: "10px", color: "gray" }}>
            No similar genes
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneSelector;
