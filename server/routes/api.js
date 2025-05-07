const express = require("express");
const router = express.Router();
const llmController = require("../controllers/llmController");

// 測試路由
router.get("/test", (req, res) => {
  res.json({ message: "API is working" });
});

// LLM相關路由
router.post("/llm", llmController.processLLMRequest);

module.exports = router;
