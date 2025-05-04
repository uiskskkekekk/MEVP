import React, { useEffect, useState } from "react";
import axios from "axios";

const ITEMS_PER_PAGE = 10;

const SequenceAlignmentApp = () => {
  const [geneNames, setGeneNames] = useState([]);
  const [selectedGene, setSelectedGene] = useState(null);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // 第一次掛載時只取得所有基因名稱
    axios.get("http://localhost:3000/sequences/gene-names")
      .then((res) => {
        setGeneNames(res.data.geneNames);
        setTotalPages(Math.ceil(res.data.geneNames.length / ITEMS_PER_PAGE));
      })
      .catch((err) => {
        console.error("❌ 無法取得基因清單:", err);
      });
  }, []);

  const handleGeneClick = (geneName) => {
    setSelectedGene(geneName);
    setSelectedSequence("🔄 載入中...");

    axios.get(`http://localhost:3000/sequences/${encodeURIComponent(geneName)}`)
      .then((res) => {
        setSelectedSequence(res.data.sequence || "⚠️ 找不到序列");
      })
      .catch((err) => {
        console.error("❌ 無法取得序列:", err);
        setSelectedSequence("❌ 發生錯誤");
      });
  };

  const currentPageGenes = geneNames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">🧬 Sequence Alignment Viewer</h2>

      <div className="flex">
        {/* Gene Name List */}
        <div className="w-1/3 pr-4">
          <h3 className="font-semibold mb-1">基因清單 (第 {currentPage} 頁 / 共 {totalPages} 頁):</h3>

          <ul className="border rounded max-h-96 overflow-auto">
            {currentPageGenes.map((name) => (
              <li
                key={name}
                className={`p-2 cursor-pointer hover:bg-blue-100 ${
                  selectedGene === name ? "bg-blue-200" : ""
                }`}
                onClick={() => handleGeneClick(name)}
              >
                {name}
              </li>
            ))}
          </ul>

          {/* Pagination Controls */}
          <div className="flex justify-between mt-2">
            <button
              className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ◀ 上一頁
            </button>
            <button
              className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              下一頁 ▶
            </button>
          </div>
        </div>

        {/* Sequence Viewer */}
        <div className="w-2/3">
          <h3 className="font-semibold mb-1">基因序列:</h3>
          <div className="border rounded p-3 bg-gray-50 whitespace-pre-wrap max-h-96 overflow-auto">
            {selectedGene ? (
              selectedSequence
            ) : (
              "請選擇一個基因以查看序列。"
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAlignmentApp;
