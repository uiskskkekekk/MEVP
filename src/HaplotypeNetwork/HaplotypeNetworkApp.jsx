import React, { useState, useEffect, useRef } from "react";
import TaiwanMapComponent from "./components/TaiwanMapComponent";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMapComponent";
import HaplotypeList from "./components/HaplotypeList";
import GeneTable from "./components/GeneTable";
import GeneSelector from "./components/GeneSelector";
import HaplotypeNetwork from "./components/HaplotypeNetwork";

import HaplotypeReducer from "./components/HaplotypeReducer";


import './HaplotypeNetworkApp.css';

const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`);

const HaplotypeNetworkApp = ({ 
  initialFileContent = "" ,
  initialFileName = "",              // ✅ 加這行
  eDnaSampleContent = "",
  eDnaTagsContent = "",
}) => {
  const [activeSection, setActiveSection] = useState("taiwanMap");
  const [genes, setGenes] = useState([]);
  const [geneColors, setGeneColors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGene, setSelectedGene] = useState(null);
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]);
  const [cityUpdateFlags, setCityUpdateFlags] = useState({});
  const [cityGeneData, setCityGeneData] = useState({});

  const [totalCityGeneData, setTotalCityGeneData] = useState({});
  const [viewMode, setViewMode] = useState("count"); // 👈 從 GeneTable 傳上來
const [hapColors, setHapColors] = useState({});   // 👈 也是從 GeneTable 傳上來




  const [selectedGenes, setSelectedGenes] = useState([]);

  const workerRef = useRef(null);
  const genesPerPage = 13;
  const totalPages = Math.ceil(genes.length / genesPerPage);
  const paginatedGenes = genes.slice((currentPage - 1) * genesPerPage, currentPage * genesPerPage);

  const updateMapData = (updatedCities) => {
    const partialData = {};
    updatedCities.forEach((city) => {
      const cityData = {};
      genes.forEach((gene) => {
        const count = gene.counts[city] || 0;
        if (count > 0) cityData[gene.name] = count;
      });
      partialData[city] = cityData;
    });
    setCityUpdateFlags((prev) => {
      const next = { ...prev };
      updatedCities.forEach((city) => {
        next[city] = (next[city] || 0) + 1;
      });
      return next;
    });
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "update", partialData });
    }
  };

  const showAllGenes = () => setSelectedGene(null);

  const loadGeneCountsFromBackend = async (geneNames) => {
    try {
      const res = await fetch("/api/getGeneCounts");
      const data = await res.json();
      const countMap = new Map(data.genes.map((g) => [g.name, g.counts]));
      const updatedGenes = geneNames.map((name) => ({
        name,
        counts: countMap.get(name) || {},
      }));
      setGenes(updatedGenes);

      const fullCityData = {};
      updatedGenes.forEach((gene) => {
        Object.entries(gene.counts).forEach(([city, count]) => {
          if (!fullCityData[city]) fullCityData[city] = {};
          fullCityData[city][gene.name] = count;
        });
      });

      if (workerRef.current) {
        workerRef.current.postMessage({ type: "init", data: fullCityData });
      }
    } catch (err) {
      console.error("❌ 無法從後端載入 gene counts:", err);
      setGenes(geneNames.map((name) => ({ name, counts: {} })));
    }
  };

  const saveGeneCountsToBackend = async (updatedGenes) => {
    try {
      const res = await fetch("/api/saveGeneCounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genes: updatedGenes }),
      });
      const data = await res.json();
      console.log("✔ Gene counts 儲存成功:", data.message);
    } catch (err) {
      console.error("❌ Gene counts 儲存失敗:", err);
    }
  };

  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedGenes = genes.map((gene) =>
      gene.name === geneName
        ? { ...gene, counts: { ...gene.counts, [location]: newValue ? parseInt(newValue, 10) : 0 } }
        : gene
    );
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);
  };

  const handleEditGeneCountBulk = (updatedGenes) => {
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);
    const updatedCities = new Set();
    updatedGenes.forEach((gene) => {
      Object.keys(gene.counts).forEach((city) => updatedCities.add(city));
    });
    updateMapData(Array.from(updatedCities));
  };

  useEffect(() => {
    if (window.Worker) {
      const fileWorker = new Worker(new URL("./workers/fileWorker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current = fileWorker;
      fileWorker.onmessage = async (event) => {
        const { sequences } = event.data;
        try {
          await fetch("/api/uploadSequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sequences }),
          });
          const res = await fetch("/api/sequences");
          const data = await res.json();

          const generatedColors = generateColors(data.geneNames.length);
          const colors = {};
          data.geneNames.forEach((name, index) => {
            colors[name] = generatedColors[index % generatedColors.length];
          });
          setGeneColors(colors);
          await loadGeneCountsFromBackend(data.geneNames);
        } catch (error) {
          console.error("❌ 上傳或讀取基因資料失敗:", error);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (initialFileContent && workerRef.current) {
      workerRef.current.postMessage({
        type: "parseFile",
        fileContent: initialFileContent,
      });
    }
  }, [initialFileContent]);

  return (
  <div className="app-container">
    <div className="button-group">
      <button onClick={() => setActiveSection("taiwanMap")}>ALL sequences</button>
      <button onClick={() => setActiveSection("geneComponents")}>sequences Components</button>
      <button onClick={() => setActiveSection("haplotypeNetwork")}>Haplotype Network</button>
    </div>

    {activeSection === "taiwanMap" && (
      <div className="section flex-container">
        <TaiwanMapComponent
          genes={genes}
          cityGeneData={cityGeneData}
          totalCityGeneData={totalCityGeneData}
          onSelectedGenesChange={setSelectedGenes}
          geneColors={viewMode === "total" ? hapColors : geneColors}
          cityUpdateFlags={cityUpdateFlags}
        />
        <div className="right-panel">
  <div className="tables-row">
    <HaplotypeList paginatedGenes={paginatedGenes} geneColors={geneColors} />
    <GeneTable
      fileName={initialFileName}  
      eDnaSampleContent={eDnaSampleContent}
      eDnaTagsContent={eDnaTagsContent}
      genes={genes}
      currentPage={currentPage}
      itemsPerPage={genesPerPage}
      setCurrentPage={setCurrentPage}
      updateMapData={updateMapData}
      geneColors={viewMode === "total" ? hapColors : geneColors}
      setCityGeneData={setCityGeneData} 
      setTotalCityGeneData={setTotalCityGeneData}
      onViewModeChange={setViewMode}
      onHapColorsChange={setHapColors}
      onEditGeneCount={handleEditGeneCount}
      onEditGeneCountBulk={handleEditGeneCountBulk}
      selectedGenes={selectedGenes}
      onSelectedGenesChange={setSelectedGenes}
    />
  </div>

  <div className="pagination">
    <button
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      disabled={currentPage === 1}
    >
      Previous page
    </button>
    <span>{currentPage} / {totalPages}</span>
    <button
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
    >
      Next page
    </button>
  </div>
</div>
       
      </div>         
    )}

    {activeSection === "geneComponents" && (
      <div className="section flex-container">
        <FilteredTaiwanMapComponent
          genes={genes}
          cityUpdateFlags={cityUpdateFlags}
          cityGeneData={cityGeneData}
          selectedGene={selectedGene}
          activeSimilarityGroup={activeSimilarityGroup}
          onSelectedGenesChange={setSelectedGenes}
          totalCityGeneData={totalCityGeneData}
          geneColors={viewMode === "total" ? hapColors : geneColors}
        />
        <GeneSelector
          genes={genes}
          selectedGene={selectedGene}
          setSelectedGene={setSelectedGene}
          showAllGenes={showAllGenes}
          geneColors={geneColors}
          setActiveSimilarityGroup={setActiveSimilarityGroup}
        />
      </div>
    )}

    {( activeSection === "geneComponents") && (
      <div className="main-content">
        <HaplotypeList paginatedGenes={paginatedGenes} geneColors={geneColors} />
        <div className="pagination">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous page</button>
            <span>{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next page</button>
          </div>
      </div>
    )}

    {activeSection === "haplotypeNetwork" && (
      <div className="section">
        <HaplotypeNetwork />
      </div>
    )}

    <div className="main-content">
      <HaplotypeReducer />
    </div>
  </div>
);


};

export default HaplotypeNetworkApp;
