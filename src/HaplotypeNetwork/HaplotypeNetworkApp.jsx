import React, { useState, useEffect, useRef } from "react";
import TaiwanMapComponent from "./components/TaiwanMapComponent";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMapComponent";
import HaplotypeList from "./components/HaplotypeList";
import GeneTable from "./components/GeneTable";
import GeneSelector from "./components/GeneSelector";
import HaplotypeNetwork from "./components/HaplotypeNetwork";
import './HaplotypeNetworkApp.css';

// 生成基因顏色避免顏色重複
const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 70%, 50%)`);

const HaplotypeNetworkApp = ({ initialFileContent = "" }) => {
  /** 狀態管理 **/
  const [activeSection, setActiveSection] = useState("taiwanMap"); // 當前顯示區塊：taiwanMap、geneComponents、haplotypeNetwork
  const [genes, setGenes] = useState([]); // 基因資料陣列，包含 name 和 counts
  const [geneColors, setGeneColors] = useState({}); // 基因名稱對應的顏色映射物件
  const [currentPage, setCurrentPage] = useState(1); // 分頁目前頁數
  const [selectedGene, setSelectedGene] = useState(null); // 目前被選中的基因 (篩選用)
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]); // 相似基因群組
  const [cityUpdateFlags, setCityUpdateFlags] = useState({}); // 用於觸發城市更新的計數器
  const [cityGeneData, setCityGeneData] = useState({}); // 各城市對應基因資料
  const [selectedGenes, setSelectedGenes] = useState([]); // 多選的基因列表 (與地圖互動同步)

  const workerRef = useRef(null); // Web Worker 的引用，避免重複建立

  /** 分頁相關 **/
  const genesPerPage = 10; // 每頁顯示基因數量
  const totalPages = Math.ceil(genes.length / genesPerPage);
  const paginatedGenes = genes.slice(
    (currentPage - 1) * genesPerPage,
    currentPage * genesPerPage
  );

  const updateMapData = (updatedCities) => {
    const partialData = {};

    // 構建部分城市的基因計數資料
    updatedCities.forEach((city) => {
      const cityData = {};
      genes.forEach((gene) => {
        const count = gene.counts[city] || 0;
        if (count > 0) cityData[gene.name] = count;
      });
      partialData[city] = cityData;
    });

    // 更新城市標誌，觸發對應城市更新
    setCityUpdateFlags((prev) => {
      const next = { ...prev };
      updatedCities.forEach((city) => {
        next[city] = (next[city] || 0) + 1;
      });
      return next;
    });

    // 透過 Worker 傳送更新訊息
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "update",
        partialData,
      });
    }
  };

  /** 顯示所有基因，取消基因篩選 */
  const showAllGenes = () => setSelectedGene(null);

  const loadGeneCountsFromBackend = async (geneNames) => {
    try {
      const res = await fetch("/api/getGeneCounts");
      const data = await res.json();
      const countMap = new Map(data.genes.map((g) => [g.name, g.counts]));

      // 根據基因名稱整合基因資料
      const updatedGenes = geneNames.map((name) => ({
        name,
        counts: countMap.get(name) || {},
      }));

      setGenes(updatedGenes);

      // 整合所有城市的基因計數資料
      const fullCityData = {};
      updatedGenes.forEach((gene) => {
        Object.entries(gene.counts).forEach(([city, count]) => {
          if (!fullCityData[city]) fullCityData[city] = {};
          fullCityData[city][gene.name] = count;
        });
      });

      // 初始化 Worker 內資料
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

  const handleEditGeneCountBulk = (updatedGenes) => {
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);

    // 擷取所有受影響的城市，更新地圖
    const updatedCities = new Set();
    updatedGenes.forEach((gene) => {
      Object.keys(gene.counts).forEach((city) => updatedCities.add(city));
    });

    updateMapData(Array.from(updatedCities));
  };

  /** 初始化 Web Worker 監聽並綁定事件 **/
  useEffect(() => {
    if (window.Worker) {
      // 動態載入 Web Worker (使用 ES module)
      const fileWorker = new Worker(new URL("./workers/fileWorker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current = fileWorker;

      // 處理 Worker 回傳的基因序列資料
      fileWorker.onmessage = async (event) => {
        const { sequences } = event.data;

        try {
          // 上傳序列資料到後端
          await fetch("/api/uploadSequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sequences }),
          });

          // 取得後端基因名稱
          const res = await fetch("/api/sequences");
          const data = await res.json();

          // 根據基因數量產生顏色映射
          const generatedColors = generateColors(data.geneNames.length);
          const colors = {};
          data.geneNames.forEach((name, index) => {
            colors[name] = generatedColors[index % generatedColors.length];
          });
          setGeneColors(colors);

          // 從後端載入基因計數
          await loadGeneCountsFromBackend(data.geneNames);
        } catch (error) {
          console.error("❌ 上傳或讀取基因資料失敗:", error);
        }
      };
    }
  }, []);

  /** 當 initialFileContent 改變時，自動透過 Worker 解析檔案內容 **/
  useEffect(() => {
    if (initialFileContent && workerRef.current) {
      workerRef.current.postMessage({
        type: "parseFile",
        fileContent: initialFileContent,
      });
    }
  }, [initialFileContent]);

  /** selectedGenes 狀態變更的偵錯日誌 **/
  useEffect(() => {
    console.log("🧬 selectedGenes 狀態變更:", selectedGenes);
  }, [selectedGenes]);

  /** UI 渲染 **/
  return (
    <div className="app-container">
      {/* 頁面切換按鈕 */}
      <div className="button-group">
        <button onClick={() => setActiveSection("taiwanMap")}>ALL sequences</button>
        <button onClick={() => setActiveSection("geneComponents")}>sequences Components</button>
        <button onClick={() => setActiveSection("haplotypeNetwork")}>Haplotype Network</button>
      </div>

      {/* 台灣地圖視圖：只在 ALL sequences 顯示 */}
      {activeSection === "taiwanMap" && (
        <div className="section">
          <TaiwanMapComponent
            genes={genes}
            cityGeneData={cityGeneData}
            geneColors={geneColors}
            cityUpdateFlags={cityUpdateFlags}
            onSelectedGenesChange={setSelectedGenes} // 傳遞選中基因更新事件
          />
        </div>
      )}

      {/* 基因組成視圖：只在 sequences Components 顯示 */}
      {activeSection === "geneComponents" && (
        <div className="section">
          <FilteredTaiwanMapComponent
            genes={genes}
            cityUpdateFlags={cityUpdateFlags}
            cityGeneData={cityGeneData}
            geneColors={geneColors}
            selectedGene={selectedGene}
            activeSimilarityGroup={activeSimilarityGroup}
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

      {/* 分頁控制：只在 taiwanMap 和 geneComponents 顯示 */}
      {(activeSection === "taiwanMap" || activeSection === "geneComponents") && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            上一頁
          </button>
          <span> 第 {currentPage} 頁 / 共 {totalPages} 頁 </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
        </div>
      )}

      {/* 基因列表與表格：只在 taiwanMap 和 geneComponents 顯示 */}
      {(activeSection === "taiwanMap" || activeSection === "geneComponents") && (
        <div className="main-content">
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
            selectedGenes={selectedGenes} // 傳遞目前選中的多基因
            onSelectedGenesChange={setSelectedGenes} // 回調更新選中基因
          />
        </div>
      )}

      {/* 單獨 HaplotypeNetwork 視圖 */}
      {activeSection === "haplotypeNetwork" && (
        <div className="section">
          <HaplotypeNetwork />
        </div>
      )}
    </div>
  );
};

export default HaplotypeNetworkApp;
