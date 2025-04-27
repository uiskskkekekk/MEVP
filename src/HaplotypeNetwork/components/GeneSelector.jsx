import React, { useState, useRef } from "react";

const GeneSelector = ({
  genes,
  selectedGene,
  setSelectedGene,
  showAllGenes,
  showSpecificGene,
  geneColors,
  geneSequences,
  setActiveSimilarityGroup,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [customMin, setCustomMin] = useState(95);
  const [customMax, setCustomMax] = useState(100);
  const [progress, setProgress] = useState(null);
  const [resultPage, setResultPage] = useState(0);
  const [resultTotalPages, setResultTotalPages] = useState(0);
  const [updateToggle, setUpdateToggle] = useState(false);

  const precomputedSimilarities = useRef([]);
  const allResults = useRef(new Map());

  const pageSize = 15;
  const totalPages = Math.ceil(genes.length / pageSize);
  const currentGenes = genes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleSelect = (geneName) => {
    const isDeselecting = selectedGene === geneName;
    setSelectedGene(isDeselecting ? null : geneName);
    allResults.current.clear();
    precomputedSimilarities.current = [];
    setResultPage(0);
    setResultTotalPages(0);
    setActiveSimilarityGroup([]);
  };

  const handlePageChange = (dir) => {
    setCurrentPage((prev) => (dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, totalPages - 1)));
  };

  const handleResultPageChange = (dir) => {
    setResultPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, resultTotalPages - 1)
    );
  };

  const runWorkerIfNeeded = () => {
    return new Promise((resolve, reject) => {
      if (!selectedGene || !geneSequences[selectedGene]) return resolve([]);

      if (precomputedSimilarities.current.length > 0) return resolve(precomputedSimilarities.current);

      setProgress({ completed: 0, total: 1 });
      const worker = new Worker(new URL("../workers/compareWorker.js", import.meta.url), { type: "module" });

      worker.onmessage = (e) => {
        const { type, completed, total, data } = e.data;
        if (type === "progress") {
          setProgress({ completed, total });
        } else if (type === "done") {
          precomputedSimilarities.current = data;
          setProgress(null);
          worker.terminate();
          resolve(data);
        }
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        setProgress(null);
        worker.terminate();
        reject(err);
      };

      worker.postMessage({
        targetGene: selectedGene,
        geneSequences,
      });
    });
  };

  const filterBySimilarity = async (min, max) => {
    const all = await runWorkerIfNeeded();

    const filtered = all
      .filter(({ similarity }) => similarity >= min && similarity <= max)
      .sort((a, b) => b.similarity - a.similarity);

    allResults.current.clear();
    for (let i = 0; i < filtered.length; i += pageSize) {
      allResults.current.set(allResults.current.size, filtered.slice(i, i + pageSize));
    }

    setResultPage(0);
    setResultTotalPages(allResults.current.size);
    setActiveSimilarityGroup(filtered.map((g) => g.name));
    setUpdateToggle((u) => !u);
  };

  const paginatedResults = allResults.current.get(resultPage) || [];

  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: "220px" }}>
        <button
          onClick={() => {
            setSelectedGene(null);
            precomputedSimilarities.current = [];
            allResults.current.clear();
            setActiveSimilarityGroup([]);
            showAllGenes();
          }}
        >
          顯示所有基因
        </button>

        {currentGenes.map((gene) => (
          <button
            key={gene.name}
            onClick={() => {
              handleSelect(gene.name);
              showSpecificGene();
            }}
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

      {selectedGene && (
        <div style={{ flex: 1 }}>
          <strong>比對相似基因：</strong>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "5px" }}>
            <button onClick={() => filterBySimilarity(100, 100)}>100% 相似</button>
            <button onClick={() => filterBySimilarity(90, 99.99)}>90%~99%</button>
            <button onClick={() => filterBySimilarity(80, 89.99)}>80%~89%</button>
          </div>

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

          {progress && (
            <p style={{ marginTop: "10px", color: "blue" }}>
              正在比對中... ({progress.completed} / {progress.total})
            </p>
          )}

          {paginatedResults.length > 0 && (
            <div style={{ marginTop: "10px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              <strong>比對結果：</strong>
              <ul style={{ maxHeight: "800px", overflowY: "auto", paddingLeft: "20px" }}>
                {paginatedResults.map(({ name, similarity }) => (
                  <li key={name}>
                    <span style={{ color: geneColors[name] || "#000" }}>{name}</span> —{" "}
                    {similarity.toFixed(1)}%
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "10px" }}>
                <button onClick={() => handleResultPageChange("prev")} disabled={resultPage === 0}>
                  上一頁
                </button>
                <span>第 {resultPage + 1} 頁 / 共 {resultTotalPages} 頁</span>
                <button onClick={() => handleResultPageChange("next")} disabled={resultPage >= resultTotalPages - 1}>
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneSelector;
