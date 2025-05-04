// server.js
const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "100mb" }));

// 暫存 gene 序列資料
let geneSequences = {};

// 暫存 gene counts 資料
let geneCounts = [];

// 接收 gene sequences
app.post("/uploadSequences", (req, res) => {
  const { sequences } = req.body;
  if (!sequences || typeof sequences !== "object") {
    return res.status(400).json({ error: "Invalid sequences" });
  }

  geneSequences = sequences;
  console.log("✔ 已儲存 gene sequences，共", Object.keys(sequences).length, "筆");
  res.json({ message: "Gene sequences uploaded and stored." });
});

// ✅ 原本的：一次回傳所有名稱與序列
app.get("/sequences", (req, res) => {
  const geneNames = Object.keys(geneSequences);
  res.json({ geneNames, sequences: geneSequences });
});

// ✅ 新增：只回傳 gene 名稱（適合用於前端分頁）
app.get("/sequences/gene-names", (req, res) => {
  const geneNames = Object.keys(geneSequences);
  res.json({ geneNames });
});

// ✅ 新增：根據 gene 名稱單獨取得序列（點選才抓）
app.get("/sequences/:geneName", (req, res) => {
  const geneName = req.params.geneName;
  const sequence = geneSequences[geneName];

  if (!sequence) {
    return res.status(404).json({ error: "Gene not found" });
  }

  res.json({ sequence });
});

// 基因比對 (用 Worker)
app.post("/compare", (req, res) => {
  const { targetName, sequences } = req.body;

  if (!targetName || !sequences || !sequences[targetName]) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
    workerData: { targetName, sequences },
  });

  worker.on("message", (result) => {
    res.json(result);
  });

  worker.on("error", (err) => {
    console.error("❌ Worker error:", err);
    res.status(500).json({ error: "Worker error" });
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`⚠️ Worker stopped with exit code ${code}`);
    }
  });
});

// 儲存 gene counts
app.post("/saveGeneCounts", (req, res) => {
  const { genes } = req.body;
  if (!Array.isArray(genes)) {
    return res.status(400).json({ error: "Invalid gene data format" });
  }

  geneCounts = genes;
  console.log("✔ 已儲存 gene counts，共", genes.length, "筆");
  res.json({ message: "Gene counts saved successfully" });
});

// 取得全部 gene counts
app.get("/getGeneCounts", (req, res) => {
  res.json({ genes: geneCounts });
});

// 根據 gene 名稱陣列，回傳指定的 counts
app.post("/getGeneCountsByNames", (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: "Invalid gene names format" });
  }

  const filteredGenes = geneCounts.filter((g) => names.includes(g.name));
  res.json({ genes: filteredGenes });
});

// 啟動 Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
 

 
