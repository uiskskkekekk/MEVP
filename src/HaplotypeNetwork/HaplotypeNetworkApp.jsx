import React, { useState, useEffect, useRef } from "react";
import TaiwanMapComponent from "./components/TaiwanMapComponent";
import HaplotypeList from "./components/HaplotypeList";
import GeneTable from "./components/GeneTable";
import GeneSelector from "./components/GeneSelector";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMapComponent";

// 生成基因顏色的函數
const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`);

const HaplotypeNetworkApp = ({ initialFileContent = "" }) => {
  // 狀態變量
  const [activeSection, setActiveSection] = useState("taiwanMap"); // 目前顯示的區塊 (地圖 or 基因組件)
  const [genes, setGenes] = useState([]); // 基因數據
  const [geneColors, setGeneColors] = useState({}); // 基因顏色映射
  const [currentPage, setCurrentPage] = useState(1); // 當前頁面
  const [selectedGene, setSelectedGene] = useState(null); // 當前選中的基因
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]); // 目前選中的相似性基因群組
  const [cityUpdateFlags, setCityUpdateFlags] = useState({}); // 城市更新標誌
  const [cityGeneData, setCityGeneData] = useState({}); // 城市基因數據
  const workerRef = useRef(null); // 用來儲存 Web Worker 的引用

  // 每頁顯示的基因數量
  const genesPerPage = 100;
  const totalPages = Math.ceil(genes.length / genesPerPage); // 計算總頁數
  const paginatedGenes = genes.slice(
    (currentPage - 1) * genesPerPage,
    currentPage * genesPerPage
  ); // 當前頁的基因數據

  // 更新地圖數據的函數
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

    // 更新城市標誌
    setCityUpdateFlags((prev) => {
      const next = { ...prev };
      updatedCities.forEach((city) => {
        next[city] = (next[city] || 0) + 1;
      });
      return next;
    });

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "update",
        partialData,
      });
    }
  };

  // 顯示所有基因的函數
  const showAllGenes = () => setSelectedGene(null);

  // 從後端載入基因數量的函數
  const loadGeneCountsFromBackend = async (geneNames) => {
    try {
      const res = await fetch("/api/getGeneCounts");
      const data = await res.json();
      const countMap = new Map(data.genes.map((g) => [g.name, g.counts]));

      // 更新基因數據
      const updatedGenes = geneNames.map((name) => ({
        name,
        counts: countMap.get(name) || {},
      }));

      setGenes(updatedGenes);

      // 整合所有城市的基因數據
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

  // 儲存基因數量到後端的函數
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

  // 編輯單個基因數量的處理函數
  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedGenes = genes.map((gene) => {
      if (gene.name === geneName) {
        return {
          ...gene,
          counts: {
            ...gene.counts,
            [location]: newValue ? parseInt(newValue, 10) : 0,
          },
        };
      }
      return gene;
    });
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);
  };

  // 批量編輯基因數量的處理函數
  const handleEditGeneCountBulk = (updatedGenes) => {
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);

    // 更新受影響的城市
    const updatedCities = new Set();
    updatedGenes.forEach((gene) => {
      Object.keys(gene.counts).forEach((city) => updatedCities.add(city));
    });

    updateMapData(Array.from(updatedCities));
  };

  // 建立並綁定 Web Worker 處理基因資料的訊息
  useEffect(() => {
    if (window.Worker) {
      const fileWorker = new Worker(new URL("./workers/fileWorker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current = fileWorker;

      // 處理 Web Worker 的回應
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

  // 自動處理來自 App 的檔案內容
  useEffect(() => {
    if (initialFileContent && workerRef.current) {
      workerRef.current.postMessage({
        type: "parseFile",
        fileContent: initialFileContent,
      });
    }
  }, [initialFileContent]);

  // 渲染 UI
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveSection("taiwanMap")}>ALL sequences</button>
        <button onClick={() => setActiveSection("geneComponents")}>sequences Components</button>
      </div>

      <div
        style={{
          display: activeSection === "taiwanMap" ? "flex" : "none",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        <TaiwanMapComponent
          genes={genes}
          cityGeneData={cityGeneData}
          geneColors={geneColors}
          cityUpdateFlags={cityUpdateFlags}
        />
      </div>

      <div
        style={{
          display: activeSection === "geneComponents" ? "flex" : "none",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        <GeneSelector
          genes={genes}
          selectedGene={selectedGene}
          setSelectedGene={setSelectedGene}
          showAllGenes={showAllGenes}
          geneColors={geneColors}
          setActiveSimilarityGroup={setActiveSimilarityGroup}
        />
        <FilteredTaiwanMapComponent
          genes={genes}
          cityUpdateFlags={cityUpdateFlags}
          cityGeneData={cityGeneData}
          geneColors={geneColors}
          selectedGene={selectedGene}
          activeSimilarityGroup={activeSimilarityGroup}
        />
      </div>

      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
          上一頁
        </button>
        <span> 第 {currentPage} 頁 / 共 {totalPages} 頁 </span>
        <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          下一頁
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <HaplotypeList paginatedGenes={paginatedGenes} geneColors={geneColors} />
        <GeneTable
          genes={genes}
          currentPage={currentPage}
          itemsPerPage={genesPerPage}
          updateMapData={updateMapData}
          geneColors={geneColors}
          setCityGeneData={setCityGeneData}
          onEditGeneCount={handleEditGeneCount}
          setCurrentPage={setCurrentPage}
          onEditGeneCountBulk={handleEditGeneCountBulk}
        />
      </div>
    </div>
  );
};

export default HaplotypeNetworkApp;
