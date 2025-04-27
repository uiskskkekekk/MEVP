import React, { useEffect, useState } from "react";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMapComponent";
import GeneSelector from "./components/GeneSelector";
import GeneTable from "./components/GeneTable";
import HaplotypeList from "./components/HaplotypeList";
import TaiwanMapComponent from "./components/TaiwanMapComponent";

// 顏色產生器
const generateColors = (num) => {
  return Array.from(
    { length: num },
    (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`
  );
};

const HaplotypeNetworkApp = () => {
  const [genes, setGenes] = useState([]);
  const [geneColors, setGeneColors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [mapKey, setMapKey] = useState(0);
  const [selectedGene, setSelectedGene] = useState(null);

  const [activeGene, setActiveGene] = useState(null);
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]);
  const [geneSequences, setGeneSequences] = useState({});

  const genesPerPage = 500;
  const totalPages = Math.ceil(genes.length / genesPerPage);
  const startIdx = (currentPage - 1) * genesPerPage;
  const endIdx = startIdx + genesPerPage;
  const paginatedGenes = genes.slice(startIdx, endIdx);

  const updateMapData = () => {
    setMapKey((prevKey) => prevKey + 1);
  };

  const showAllGenes = () => {
    setActiveGene(null);
  };

  const showSpecificGene = () => {
    if (selectedGene) setActiveGene(selectedGene);
  };

  useEffect(() => {
    if (window.Worker) {
      const worker = new Worker(
        new URL("./workers/fileWorker.js", import.meta.url),
        {
          type: "module",
        }
      );

      worker.onmessage = (event) => {
        console.log("Worker 回傳：", event.data);
        const { geneNames, sequences } = event.data;

        const uniqueColors = generateColors(geneNames.length);
        const newColors = {};
        geneNames.forEach((name, index) => {
          newColors[name] = uniqueColors[index % uniqueColors.length];
        });

        setGeneColors(newColors);
        setGenes(geneNames.map((name) => ({ name, counts: {} })));
        setGeneSequences(sequences);
      };

      window.handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          worker.postMessage(e.target.result);
        };
        reader.readAsText(file);
      };
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
      }}
    >
      <input
        type="file"
        accept=".fa,.fasta,.txt"
        onChange={(e) => window.handleFileChange(e)}
      />

      {/* 主體區域：地圖 + 選擇器 + 篩選後地圖 */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* 左：地圖 */}
        <TaiwanMapComponent
          key={mapKey}
          genes={genes}
          geneColors={geneColors}
          activeGene={activeGene}
          activeSimilarityGroup={activeSimilarityGroup}
        />

        {/* 中：基因選擇器 */}
        <GeneSelector
          genes={genes}
          selectedGene={selectedGene}
          setSelectedGene={setSelectedGene}
          showAllGenes={showAllGenes}
          showSpecificGene={showSpecificGene}
          geneColors={geneColors}
          geneSequences={geneSequences}
          setActiveSimilarityGroup={setActiveSimilarityGroup}
        />

        {/* 右：篩選後地圖 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <FilteredTaiwanMapComponent
            genes={genes}
            geneColors={geneColors}
            activeGene={selectedGene}
            activeSimilarityGroup={activeSimilarityGroup}
          />
        </div>
      </div>

      {/* 分頁控制 */}
      <div style={{ marginTop: "10px" }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        >
          上一頁
        </button>
        <span>
          {" "}
          第 {currentPage} 頁 / 共 {totalPages} 頁{" "}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
        >
          下一頁
        </button>
      </div>

      {/* 資料表與樣本列表 */}
      <div style={{ display: "flex", gap: "20px" }}>
        <HaplotypeList
          paginatedGenes={paginatedGenes}
          geneColors={geneColors}
        />
        <GeneTable
          genes={genes}
          setGenes={setGenes}
          paginatedGenes={paginatedGenes}
          currentPage={currentPage}
          itemsPerPage={genesPerPage}
          updateMapData={updateMapData}
          geneColors={geneColors}
        />
      </div>
    </div>
  );
};

export default HaplotypeNetworkApp;
