import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const HaplotypeNetwork = ({ width = 1000, height = 1000 }) => {
  const svgRef = useRef();
  const zoomRef = useRef({
    zoomBehavior: null,
    group: null,
    transform: d3.zoomIdentity,
  });

  const [data, setData] = useState(null);
  const [cityColors, setCityColors] = useState({});
  const [maxDistance, setMaxDistance] = useState(2);

  const fetchData = (distance) => {
    fetch(`http://localhost:3000/HaplotypeNetwork?maxDistance=${distance}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  };

  useEffect(() => {
    fetchData(maxDistance);
  }, [maxDistance]);

  useEffect(() => {
    if (!data?.nodes || !data?.edges) return;

    const validNodes = data.nodes.filter((d) => typeof d.count === "number" && d.count > 0);
    if (!validNodes.length) return;

    const svg = d3.select(svgRef.current).attr("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "zoom-group");
    zoomRef.current.group = g;

    const allCities = new Set();
    validNodes.forEach((node) => {
      if (node.cities) Object.keys(node.cities).forEach((c) => allCities.add(c));
    });
    const cityList = Array.from(allCities);
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(cityList);

    const cityColorMap = {};
    cityList.forEach((city) => {
      cityColorMap[city] = colorScale(city);
    });
    setCityColors(cityColorMap);

    const maxCount = d3.max(validNodes, (d) => d.count);
    const r = d3.scaleSqrt().domain([1, maxCount || 1]).range([10, 30]);

    const sim = d3
      .forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id((d) => d.id).distance(30))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d) => r(d.count) + 5));

    const linkGroup = g.append("g").attr("class", "links");

    linkGroup
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", "#bbb")
      .attr("stroke-width", 1.5);

    const edgeLabels = linkGroup
      .selectAll("text")
      .data(data.edges)
      .join("text")
      .text((d) => d.distance)
      .attr("font-size", 10)
      .attr("fill", "#666")
      .attr("text-anchor", "middle");

    const node = g
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = d.fy = null;
          })
      );

    const pie = d3.pie().value(([_, value]) => value);
    const arc = d3.arc();

    node.each(function (d) {
      const group = d3.select(this);
      const radius = r(d.count);

      const entries = d.cities ? Object.entries(d.cities) : [];

      if (!entries.length) {
        group
          .append("circle")
          .attr("r", radius)
          .attr("fill", "#ccc")
          .attr("stroke", "#333");
        return;
      }

      const arcs = pie(entries);

      group
        .selectAll("path")
        .data(arcs)
        .join("path")
        .attr("d", arc.innerRadius(0).outerRadius(radius))
        .attr("fill", (arcData) => cityColorMap[arcData.data[0]] || "#999")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5);
    });

    node
      .append("title")
      .text((d) =>
        [
          `ID: ${d.id}`,
          `Count: ${d.count}`,
          ...Object.entries(d.cities || {}).map(([c, n]) => `${c}: ${n}`),
        ].join("\n")
      );

    node
      .append("text")
      .text((d) => d.id)
      .attr("y", (d) => -r(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr("font-size", 10);

    sim.on("tick", () => {
      g.selectAll("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      edgeLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    const zoomBehavior = d3
      .zoom()
      .filter(() => false)
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        zoomRef.current.group.attr("transform", event.transform);
        zoomRef.current.transform = event.transform;
      });

    svg.call(zoomBehavior);
    zoomRef.current.zoomBehavior = zoomBehavior;
    zoomRef.current.transform = d3.zoomIdentity;
  }, [data, width, height]);

  const handleZoom = (dir) => {
    const { zoomBehavior, transform } = zoomRef.current;
    if (!zoomBehavior) return;

    const svg = d3.select(svgRef.current);
    const next = dir === "in" ? transform.scale(1.2) : transform.scale(0.8);

    svg.transition().duration(300).call(zoomBehavior.transform, next);
    zoomRef.current.transform = next;
  };

  return (
    <div style={{ display: "flex", gap: 20, fontFamily: "sans-serif" }}>
      <div>
        <h2 style={{ margin: "10px 0" }}>Haplotype Network</h2>
        {!data && <p>Loading...</p>}
        {data?.error && <p style={{ color: "red" }}>無法載入資料</p>}

        <div style={{ margin: "10px 0" }}>
          <button
            onClick={() => handleZoom("in")}
            style={{
              padding: "6px 12px",
              marginRight: 10,
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            🔍 放大
          </button>
          <button
            onClick={() => handleZoom("out")}
            style={{
              padding: "6px 12px",
              backgroundColor: "#424242",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            🔎 縮小
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            最大距離（maxDistance）: {maxDistance}
            <input
              type="range"
              min={1}
              max={100}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              style={{ marginLeft: 10 }}
            />
          </label>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            backgroundColor: "#fafafa",
          }}
        />
      </div>

      {Object.keys(cityColors).length > 0 && (
        <div
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
            height: "fit-content",
            backgroundColor: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>城市圖例</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {Object.entries(cityColors).map(([city, color]) => (
              <li
                key={city}
                style={{
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: color,
                    marginRight: 8,
                    border: "1px solid #000",
                  }}
                />
                {city}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && !data.error && (
        <pre
          style={{
            maxHeight: 800,
            overflow: "auto",
            background: "#eee",
            padding: 10,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

    </div>

    
  );
};

export default HaplotypeNetwork;
