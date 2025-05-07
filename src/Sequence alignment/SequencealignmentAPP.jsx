import React, { useEffect, useState } from "react";

const ITEMS_PER_PAGE = 10;

const parseFasta = (content) => {
  const sequences = {};
  const lines = content.split(/\r?\n/);
  let currentGene = null;

  lines.forEach((line) => {
    if (line.startsWith(">")) {
      currentGene = line.slice(1).trim();
      sequences[currentGene] = "";
    } else if (currentGene) {
      sequences[currentGene] += line.trim();
    }
  });

  return sequences;
};

const SequenceAlignmentApp = ({ haplotypeContent }) => {
  const [geneNames, setGeneNames] = useState([]);
  const [sequences, setSequences] = useState({});
  const [selectedGene, setSelectedGene] = useState(null);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (haplotypeContent) {
      const parsed = parseFasta(haplotypeContent);
      const names = Object.keys(parsed);

      setSequences(parsed);
      setGeneNames(names);
      setTotalPages(Math.ceil(names.length / ITEMS_PER_PAGE));
      setCurrentPage(1);
      setSelectedGene(null);
      setSelectedSequence("");
    }
  }, [haplotypeContent]);

  const handleGeneClick = (geneName) => {
    setSelectedGene(geneName);
    setSelectedSequence(sequences[geneName] || "⚠️ 找不到序列");
  };

  const currentPageGenes = geneNames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">🧬 Sequence Alignment Viewer</h2>

      <div className="flex">
        <div className="w-1/3 pr-4">
          <h3 className="font-semibold mb-1">
            基因清單 (第 {currentPage} 頁 / 共 {totalPages} 頁):
          </h3>
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

        <div className="w-2/3">
          <h3 className="font-semibold mb-1">基因序列:</h3>
          <div className="border rounded p-3 bg-gray-50 whitespace-pre-wrap max-h-96 overflow-auto">
            {selectedGene ? selectedSequence : "請選擇一個基因以查看序列。"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAlignmentApp;

