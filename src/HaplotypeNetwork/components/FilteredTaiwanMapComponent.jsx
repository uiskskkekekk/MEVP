import React, { useMemo, memo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import "../components/AppStyles.css";

const areEqual = (prevProps, nextProps) => {
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.chartData.totalCount !== nextProps.chartData.totalCount) return false;

  const prevData = prevProps.chartData.data;
  const nextData = nextProps.chartData.data;
  if (prevData.length !== nextData.length) return false;

  for (let i = 0; i < prevData.length; i++) {
    if (
      prevData[i].name !== nextData[i].name ||
      prevData[i].value !== nextData[i].value
    ) {
      return false;
    }
  }

  return true;
};

const CityPieChart = memo(({ city, chartData, geneColors, position }) => {
  const { data, totalCount } = chartData;
  const outerRadius = Math.min(5 + Math.floor(totalCount / 5) * 5, 25);

  if (!position?.cx || !position?.cy) return null;

  return (
    <div
      className="city-pie-chart"
      style={{ left: `${position.cx}px`, top: `${position.cy}px` }}
    >
      <PieChart width={outerRadius * 2} height={outerRadius * 2}>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={outerRadius}>
          {data.map((entry, index) => (
            <Cell key={`cell-${city}-${index}`} fill={geneColors[entry.name]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
}, areEqual);

const FilteredTaiwanMapComponent = ({
  genes,
  cityGeneData,
  geneColors,
  selectedGene,
  activeSimilarityGroup,
  onSelectedGenesChange,
}) => {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const genesPerPage = 100;

  const allGenes = useMemo(() => genes.map((g) => g.name), [genes]);

  useEffect(() => {
    const allowed = new Set([
      selectedGene,
      ...(Array.isArray(activeSimilarityGroup) ? activeSimilarityGroup : []),
    ]);
    setSelectedGenes(Array.from(allowed).filter(Boolean));
  }, [selectedGene, activeSimilarityGroup]);

  useEffect(() => {
    if (onSelectedGenesChange) {
      onSelectedGenesChange(selectedGenes);
    }
  }, [selectedGenes, onSelectedGenesChange]);

  const filteredGeneList = useMemo(() => {
    return allGenes.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allGenes, searchTerm]);

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );
  const totalPages = Math.ceil(filteredGeneList.length / genesPerPage);

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);

  const filteredCityGeneData = useMemo(() => {
    const result = {};
    for (const [city, { genes, coordinates }] of Object.entries(cityGeneData)) {
      const data = genes.filter((g) => selectedGenes.includes(g.name));
      if (data.length > 0) {
        const totalCount = data.reduce((sum, g) => sum + g.value, 0);
        result[city] = { data, totalCount, coordinates };
      }
    }
    return result;
  }, [cityGeneData, selectedGenes]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lon = 120.0 + (x / 400) * (122.0 - 120.0);
    const lat = 25.0 - (y / 600) * (25.0 - 22.0);
    setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  };

  return (
    <div className="flex flex-gap-10">
      <div className="map-containerFiltered" onMouseMove={handleMouseMove}>
        <img src={TaiwanMapImage} alt="Taiwan Map" width={465} height={658.5} />
        {Object.entries(filteredCityGeneData).map(([city, chartData]) => (
          <CityPieChart
            key={city}
            city={city}
            chartData={chartData}
            geneColors={geneColors}
            position={chartData.coordinates}
          />
        ))}
        <div className="coord-label">
          longitude: {latLon.lon}°E<br />
          latitude: {latLon.lat}°N
        </div>
      </div>

      <div className="flex flex-column" style={{ width: "300px" }}>
        <div style={{ marginBottom: "8px" }}>
          <h4>Select display genes：</h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="search-input"
          />
          <div className="flex flex-gap-5">
            <button onClick={handleSelectAll}>all</button>
            <button onClick={handleClearAll}>Clear</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", maxHeight: "460px", paddingRight: "5px" }}>
          {currentGenes.map((name) => {
            const isEnabled =
              name === selectedGene ||
              (Array.isArray(activeSimilarityGroup) && activeSimilarityGroup.includes(name));
            return (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: isEnabled ? 1 : 0.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedGenes.includes(name)}
                  onChange={() => toggleGene(name)}
                  disabled={!isEnabled}
                />
                <span style={{ color: geneColors[name] || "black" }}>{name}</span>
              </label>
            );
          })}
        </div>

        <div className="pagination-controls">
          <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
            Previous page
          </button>
          <span> {currentPage + 1}  /  {totalPages} </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next page
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilteredTaiwanMapComponent;
