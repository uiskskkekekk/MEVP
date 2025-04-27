import React, { memo, useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import TaiwanMapImage from "../../assets/haplotype/TW.png";
import { cityCoordinates } from "../data/cityCoordinates";

const areEqual = (prevProps, nextProps) => {
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.chartData.totalCount !== nextProps.chartData.totalCount)
    return false;

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
  const outerRadius = Math.min(10 + Math.floor(totalCount / 10) * 10, 50);

  return (
    <div
      style={{
        position: "absolute",
        left: `${position.cx}px`,
        top: `${position.cy}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <PieChart width={outerRadius * 2} height={outerRadius * 2}>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
        >
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
  geneColors,
  activeGene,
  activeSimilarityGroup,
}) => {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });

  const mapWidth = 400;
  const mapHeight = 600;
  const minLon = 120.0;
  const maxLon = 122.0;
  const minLat = 22.0;
  const maxLat = 25.0;

  const memoizedChartData = useMemo(() => {
    const result = {};

    if (
      !activeGene &&
      (!activeSimilarityGroup || activeSimilarityGroup.length === 0)
    ) {
      return result;
    }

    const targetGeneNames = [activeGene, ...(activeSimilarityGroup || [])];

    for (const city of Object.keys(cityCoordinates)) {
      const data = [];
      let totalCount = 0;

      for (const geneName of targetGeneNames) {
        const gene = genes.find((g) => g.name === geneName);
        if (!gene) continue;

        const value = gene.counts?.[city] || 0;
        if (value > 0) {
          data.push({ name: geneName, value });
          totalCount += value;
        }
      }

      if (data.length > 0) {
        result[city] = { data, totalCount };
      }
    }

    return result;
  }, [genes, activeGene, activeSimilarityGroup]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lon = minLon + (x / mapWidth) * (maxLon - minLon);
    const lat = maxLat - (y / mapHeight) * (maxLat - minLat);

    setLatLon({
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: `${mapWidth}px`,
        height: `${mapHeight}px`,
      }}
      onMouseMove={handleMouseMove}
    >
      <img
        src={TaiwanMapImage}
        alt="Taiwan Map"
        width={mapWidth}
        height={mapHeight}
      />

      {Object.entries(memoizedChartData).map(([city, chartData]) => (
        <CityPieChart
          key={city}
          city={city}
          chartData={chartData}
          geneColors={geneColors}
          position={cityCoordinates[city]}
        />
      ))}

      <div
        style={{
          position: "absolute",
          bottom: "5px",
          left: "5px",
          backgroundColor: "rgb(4, 248, 24)",
          padding: "4px 8px",
          borderRadius: "5px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        經度: {latLon.lon}°E
        <br />
        緯度: {latLon.lat}°N
      </div>
    </div>
  );
};

export default FilteredTaiwanMapComponent;
