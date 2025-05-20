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

  /* 取得後端資料 ------------------------------------------------------- */
  useEffect(() => {
    fetch("http://localhost:3000/haplotypes")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);

  /* D3 繪圖 ------------------------------------------------------------ */
  useEffect(() => {
    if (!data?.nodes || !data?.edges) return;

    const validNodes = data.nodes.filter(
      (d) => typeof d.count === "number" && d.count > 0
    );
    if (!validNodes.length) return;

    const svg = d3.select(svgRef.current).attr("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "zoom-group");
    zoomRef.current.group = g;

    /* 色彩與大小比例尺 */
    const color = d3.scaleSequential(d3.interpolateRainbow).domain([0, validNodes.length]);
    const maxCount = d3.max(validNodes, (d) => d.count);
    const r = d3.scaleSqrt().domain([1, maxCount || 1]).range([10, 30]);

    /* 力導向佈局 */
    const sim = d3
      .forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id((d) => d.id).distance(30))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d) => r(d.count) + 5));

    /* 畫線 */
    g.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(data.edges)
      .join("line");

    /* 畫節點 */
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

    node
      .append("circle")
      .attr("r", (d) => r(d.count))
      .attr("fill", (d, i) => color(i))
      .on("click", (event) => event.stopPropagation()); // 阻止冒泡

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

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    /* 建立 zoom 行為（禁用滑鼠與觸控互動） */
    const zoomBehavior = d3
      .zoom()
      .filter(() => false) // → 完全關閉使用者互動
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        zoomRef.current.group.attr("transform", event.transform);
        zoomRef.current.transform = event.transform;
      });

    svg.call(zoomBehavior);            // 綁定，但由於 filter false -> 使用者無法觸發
    zoomRef.current.zoomBehavior = zoomBehavior;
    zoomRef.current.transform = d3.zoomIdentity;
  }, [data, width, height]);

  /* 按鈕控制縮放 -------------------------------------------------------- */
  const handleZoom = (dir) => {
    const { zoomBehavior, transform } = zoomRef.current;
    if (!zoomBehavior) return;

    const svg = d3.select(svgRef.current);
    const next = dir === "in" ? transform.scale(1.2) : transform.scale(0.8);

    svg.transition().duration(300).call(zoomBehavior.transform, next);
    zoomRef.current.transform = next;
  };

  /* UI ------------------------------------------------------------------ */
  return (
    <div>
      <h2>Haplotype Network</h2>

      {!data && <p>Loading...</p>}
      {data?.error && <p style={{ color: "red" }}>無法載入資料</p>}

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => handleZoom("in")}>🔍 放大</button>{" "}
        <button onClick={() => handleZoom("out")}>🔎 縮小</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ border: "1px solid #ccc" }}
      />

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
