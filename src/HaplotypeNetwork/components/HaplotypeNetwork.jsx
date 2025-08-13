// HaplotypeNetwork.jsx
// 使用 D3 建立帶城市分群與連線距離的單倍型網絡圖視覺化

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "../components/AppStyles.css";

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
  const [apiPath, setApiPath] = useState("HaplotypeNetwork");

  // 載入資料
  useEffect(() => {
    setData(null); // 清空，顯示 loading
    fetch(`http://localhost:3000/${apiPath}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, [apiPath]);

  // 初始化圖表
  useEffect(() => {
    if (!data?.nodes || !data?.edges) return;

    const validNodes = data.nodes.filter((d) => typeof d.count === "number" && d.count > 0);
    if (!validNodes.length) return;

    const svg = d3.select(svgRef.current).attr("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "zoom-group");
    zoomRef.current.group = g;

    // 城市顏色分配
    const allCities = new Set();
    validNodes.forEach((node) => {
      if (node.cities) Object.keys(node.cities).forEach((c) => allCities.add(c));
    });
    const cityList = Array.from(allCities);
    const cityColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(cityList);
    const cityColorMap = {};
    cityList.forEach((city) => (cityColorMap[city] = cityColorScale(city)));
    setCityColors(cityColorMap);

    // 群組顏色 + 節點半徑
    const groupIds = Array.from(new Set(validNodes.map((d) => d.groupId)));
    const groupColorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(groupIds);
    const maxCount = d3.max(validNodes, (d) => d.count);
    const r = d3.scaleSqrt().domain([1, maxCount || 1]).range([10, 30]);

    // 力導向模擬
    const sim = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.edges)
          .id((d) => d.id)
          .distance((d) => {
            if (d.source.groupId === d.target.groupId) return 5;
            const dist = d.distance;
            if (dist <= 5) return 100;
            if (dist <= 20) return 20;
            return 30;
          })
      )
      .force("charge", d3.forceManyBody().strength(-60))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d) => r(d.count) + 8));

    // 繪製邊線與距離文字
    const linkGroup = g.append("g").attr("class", "links");
    linkGroup
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", (d) => d.color || "#bbb")  // 使用後端提供的顏色
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => d.style === "dotted" ? "2,2" : null)  // 設置虛線樣式
      .attr("stroke-linecap", "round");  // 線條兩端圓角

    const edgeLabels = linkGroup
      .selectAll("text")
      .data(data.edges)
      .join("text")
      .text((d) => d.distance)
      .attr("font-size", 10)
      .attr("fill", "#666")
      .attr("text-anchor", "middle");

    // 節點群組
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

    // 繪製節點圓餅圖
    const pie = d3.pie().value(([_, value]) => value);
    const arc = d3.arc();

    node.each(function (d) {
      const group = d3.select(this);
      const radius = r(d.count);
      const entries = d.cities ? Object.entries(d.cities) : [];

      const groupColor = groupColorScale(d.groupId || "default");
      const borderWidth = d.isRepresentative ? 4 : 1.5;

      if (!entries.length) {
        group
          .append("circle")
          .attr("r", radius)
          .attr("fill", "#ccc")
          .attr("stroke", "#000")
          .attr("stroke-width", borderWidth);
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
        .attr("stroke-width", borderWidth);
    });

    // tooltip 與 label
    node
      .append("title")
      .text((d) => `ID: ${d.id}\nCount: ${d.count}\n${Object.entries(d.cities || {}).map(([c, n]) => `${c}: ${n}`).join("\n")}`);

    node
      .append("text")
      .text((d) => d.id)
      .attr("y", (d) => -r(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr("font-size", 10);

    // tick 更新圖形位置
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

    // 滑鼠縮放行為
    const zoomBehavior = d3.zoom()
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

  // 手動縮放控制
  const handleZoom = (dir) => {
    const { zoomBehavior, transform } = zoomRef.current;
    if (!zoomBehavior) return;

    const svg = d3.select(svgRef.current);
    const next = dir === "in" ? transform.scale(1.2) : transform.scale(0.8);

    svg.transition().duration(300).call(zoomBehavior.transform, next);
    zoomRef.current.transform = next;
  };

  return (
    <div className="flex" style={{ gap: 20, fontFamily: "sans-serif" }}>
      <div>
        <h2 style={{ margin: "10px 0" }}>Haplotype Network</h2>
        {!data && <p>Loading...</p>}
        {data?.error && <p style={{ color: "red" }}>Unable to load data</p>}

        {/* 縮放控制按鈕 */}
        <div style={{ margin: "10px 0" }}>
          <button className="button" style={{ backgroundColor: "#1976d2", color: "#fff", marginRight: 10 }} onClick={() => handleZoom("in")}>
            🔍 enlarge
          </button>
          <button className="button" style={{ backgroundColor: "#424242", color: "#fff" }} onClick={() => handleZoom("out")}>
            🔎 zoom out
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
  <button
    className="button"
    style={{ marginRight: 10, backgroundColor: apiPath === "HaplotypeNetwork" ? "#007bff" : "#ccc", color: "#fff" }}
    onClick={() => setApiPath("HaplotypeNetwork")}
  >
    All information
  </button>
  <button
    className="button"
    style={{ backgroundColor: apiPath === "SimplifiedHaplotypeNetwork" ? "#007bff" : "#ccc", color: "#fff" }}
    onClick={() => setApiPath("SimplifiedHaplotypeNetwork")}
  >
    reduce
  </button>
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

      {/* 城市圖例 */}
      {Object.keys(cityColors).length > 0 && (
        <div style={{
          padding: 10,
          border: "1px solid #ccc",
          borderRadius: 8,
          backgroundColor: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}>
          <h3 style={{ marginTop: 0 }}>city legend</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {Object.entries(cityColors).map(([city, color]) => (
              <li key={city} style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
                <div style={{ width: 16, height: 16, backgroundColor: color, marginRight: 8, border: "1px solid #000" }} />
                {city}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HaplotypeNetwork;
