// server.js
const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
const path = require("path");

const app = express();
const PORT = 3000;

// 中間件設定
app.use(cors()); // 允許跨域請求
app.use(express.json({ limit: "100mb" })); // 解析 JSON，限制大小 100MB

// --- 資料暫存區 ---
// 儲存基因序列資料（key: gene name, value: sequence）
let geneSequences = {};
// 儲存基因 counts，格式扁平化（每筆包含 name, city, count）
let geneCounts = [];

/**
 * 上傳基因序列
 * 接收 JSON 內的 sequences 物件，儲存到記憶體
 */
app.post("/uploadSequences", (req, res) => {
  const { sequences } = req.body;
  if (!sequences || typeof sequences !== "object") {
    return res.status(400).json({ error: "Invalid sequences" });
  }

  geneSequences = sequences;
  console.log("✔ 已儲存 gene sequences，共", Object.keys(sequences).length, "筆");
  res.json({ message: "Gene sequences uploaded and stored." });
});

/**
 * 取得所有基因名稱與序列
 * 一次回傳所有基因名稱與對應序列
 */
app.get("/sequences", (req, res) => {
  const geneNames = Object.keys(geneSequences);
  res.json({ geneNames, sequences: geneSequences });
});

/**
 * 取得所有基因名稱（輕量版）
 * 適合前端分頁使用，僅回傳名稱列表
 */
app.get("/sequences/gene-names", (req, res) => {
  const geneNames = Object.keys(geneSequences);
  res.json({ geneNames });
});

/**
 * 根據基因名稱取得單一序列
 * 適用點選基因時才載入完整序列
 */
app.get("/sequences/:geneName", (req, res) => {
  const geneName = req.params.geneName;
  const sequence = geneSequences[geneName];

  if (!sequence) {
    return res.status(404).json({ error: "Gene not found" });
  }

  res.json({ sequence });
});

/**
 * 基因比對（使用 Worker Thread 避免阻塞主線程）
 * 輸入目標基因名稱及序列資料，Worker 計算比對結果後回傳
 */
app.post("/compare", (req, res) => {
  const { targetName, sequences } = req.body;

  if (!targetName || !sequences || !sequences[targetName]) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
    workerData: { targetName, sequences },
  });

  // 接收 Worker 傳回的比對結果
  worker.on("message", (result) => {
    res.json(result);
  });

  // 錯誤處理
  worker.on("error", (err) => {
    console.error("❌ Worker error:", err);
    res.status(500).json({ error: "Worker error" });
  });

  // Worker 結束監控
  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`⚠️ Worker stopped with exit code ${code}`);
    }
  });
});

/**
 * 儲存基因 counts
 * 接收扁平化前的結構並轉換成扁平化格式存入記憶體
 * 輸入格式: [{ name, counts: { city: count } }]
 * 轉換為: [{ name, city, count }]
 */
app.post("/saveGeneCounts", (req, res) => {
  const { genes } = req.body;
  if (!Array.isArray(genes)) {
    return res.status(400).json({ error: "Invalid gene data format" });
  }

  let flattened = [];

  // ✅ 自動偵測格式並轉換
  if (genes.length > 0 && genes[0].counts) {
    // 格式為 { name, counts: { city: count } }
    flattened = genes.flatMap(({ name, counts }) => {
      if (typeof counts !== "object") return [];
      return Object.entries(counts).map(([city, count]) => ({
        name,
        city,
        count,
      }));
    });
  } else if (genes.length > 0 && genes[0].city && genes[0].count != null) {
    // 格式為 { name, city, count }
    flattened = genes;
  } else {
    return res.status(400).json({ error: "Unrecognized gene format" });
  }

  // ✅ 如果你要合併而不是覆蓋，可考慮這段（可選）
  // flattened = [...geneCounts, ...flattened];

  // ✅ 預設行為：覆蓋儲存
  geneCounts = flattened;
  console.log("✔ 已儲存 gene counts（格式統一後）共", geneCounts.length, "筆");

  res.json({ message: "Gene counts saved and normalized successfully" });
});


/**
 * 取得所有基因 counts（扁平化後）
 */
app.get("/getGeneCounts", (req, res) => {
  res.json({ genes: geneCounts });
});

/**
 * 根據基因名稱陣列，取得對應的 counts
 */
app.post("/getGeneCountsByNames", (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: "Invalid gene names format" });
  }

  const filteredGenes = geneCounts.filter((g) => names.includes(g.name));
  res.json({ genes: filteredGenes });
});

/**
 * 計算兩序列間的 Hamming distance
 * 只在序列長度相同時計算，否則回傳無限大
 */
function hammingDistance(seq1, seq2) {
  if (seq1.length !== seq2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) dist++;
  }
  return dist;
}

/**
 * 建立 Haplotype 圖資料（nodes 與 edges）
 * nodes: 唯一序列及其相關城市與數量
 * edges: Hamming distance = 1 的序列連線
 */
app.get("/HaplotypeNetwork", (req, res) => {
  const sequenceMap = new Map();

  for (const { name, city, count } of geneCounts) {
    const sequence = geneSequences[name];
    if (!sequence) continue;

    if (!sequenceMap.has(sequence)) {
      sequenceMap.set(sequence, []);
    }
    sequenceMap.get(sequence).push({ name, city, count });
  }

  const nodes = [];
  const representatives = [];
  const edges = [];

  let groupIdCounter = 0;

  for (const [sequence, geneGroup] of sequenceMap.entries()) {
    const nodeMap = new Map();

    for (const { name, city, count } of geneGroup) {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          id: name,
          sequence,
          count: 0,
          cities: {},
          groupId: groupIdCounter,
        });
      }
      const node = nodeMap.get(name);
      node.count += count;
      node.cities[city] = (node.cities[city] || 0) + count;
    }

    const groupNodes = Array.from(nodeMap.values());
    const representative = groupNodes.reduce((a, b) => (a.count >= b.count ? a : b));
    representative.isRepresentative = true;

    representatives.push(representative);
    nodes.push(...groupNodes);

    for (const node of groupNodes) {
      if (node.id !== representative.id) {
        edges.push({
          source: node.id,
          target: representative.id,
          distance: 0,
        });
      }
    }

    groupIdCounter++;
  }

  // 建立代表之間的環狀連線（依 Hamming distance 貪婪最小距離）
  const used = new Set();
  let current = representatives[0];
  used.add(current.id);

  while (used.size < representatives.length) {
    let minDist = Infinity;
    let closest = null;

    for (const rep of representatives) {
      if (used.has(rep.id)) continue;
      const dist = hammingDistance(current.sequence, rep.sequence);
      if (dist < minDist) {
        minDist = dist;
        closest = rep;
      }
    }

    if (closest) {
      edges.push({
        source: current.id,
        target: closest.id,
        distance: hammingDistance(current.sequence, closest.sequence),
      });
      used.add(closest.id);
      current = closest;
    }
  }

  const start = representatives[0];
  edges.push({
    source: current.id,
    target: start.id,
    distance: hammingDistance(current.sequence, start.sequence),
  });

  res.json({ nodes, edges });
});




/**
 * 啟動 Express Server
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});