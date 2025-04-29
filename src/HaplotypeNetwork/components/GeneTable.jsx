import React, { useEffect, useMemo, useState } from "react";

const GeneTable = ({
  genes,
  currentPage,
  itemsPerPage,
  updateMapData,
  geneColors,
  setCityGeneData,
  onEditGeneCount,
  setCurrentPage, // 這行是新加的，讓搜尋時可以跳回第1頁
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const locations = [
    "台北", "新北", "基隆", "桃園", "新竹", "苗栗", "台中",
    "彰化", "南投", "雲林", "嘉義", "台南", "高雄", "屏東",
    "花蓮", "台東", "宜蘭",
  ];

  const filteredGenes = useMemo(() => {
    return genes.filter((gene) =>
      gene.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genes, searchTerm]);

  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredGenes.slice(startIdx, endIdx);
  }, [filteredGenes, currentPage, itemsPerPage]);

  useEffect(() => {
    const cityMap = {};
    for (const loc of locations) cityMap[loc] = [];

    genes.forEach((gene) => {
      locations.forEach((loc) => {
        const count = gene.counts?.[loc] || 0;
        if (count > 0) {
          cityMap[loc].push({
            name: gene.name,
            color: geneColors[gene.name] || "#000",
            value: count,
          });
        }
      });
    });

    setCityGeneData(cityMap);
  }, [genes, geneColors, setCityGeneData]);

  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);

    console.log(`Editing gene: ${geneName}, location: ${location}, new count: ${updatedCount}`);
    onEditGeneCount(geneName, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (setCurrentPage) {
      setCurrentPage(1); // 搜尋時自動回到第1頁
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <h2>基因數據表</h2>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="搜尋基因名稱"
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: "5px", width: "200px" }}
        />
      </div>

      <table border="1">
        <thead>
          <tr>
            <th>基因</th>
            {locations.map((loc) => (
              <th key={loc}>{loc}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedGenes.length > 0 ? (
            paginatedGenes.map((gene) => (
              <tr key={gene.name}>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      backgroundColor: geneColors[gene.name] || "black",
                      marginRight: "5px",
                    }}
                  ></span>
                  {gene.name}
                </td>
                {locations.map((loc) => (
                  <td key={`${gene.name}-${loc}`}>
                    <input
                      type="number"
                      min="0"
                      value={gene.counts?.[loc] || 0}
                      onChange={(e) =>
                        handleEditGeneCount(gene.name, loc, e.target.value)
                      }
                      style={{ width: "40px" }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={locations.length + 1}>無基因數據</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GeneTable;


