const axios = require("axios");

// 處理LLM請求
exports.processLLMRequest = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: "Missing query parameter",
      });
    }

    // 增強提示詞，要求LLM返回結構化命令
    const prompt = `You are a command parser. Convert user input: "${query}" into a JSON command.

    Strictly follow these rules:
    1. Return only valid JSON, without any additional text
    2. If unable to parse as a known command, return {"action":"unknown","target":"unknown"}

    Supported command format:
    {"action":"action type","target":"phylotree","parameters":{"parameter name":parameter value}}

    target:
    - phylotree

    Supported actions:
    - adjustWidth (parameters:width)
    - adjustHeight (parameters:height)
    - adjustSize (parameters:width,height) Note: width comes first, height second. Please correct if user inputs them in reverse order
    - expand (parameters:dimension,amount)
    - compress (parameters:dimension,amount)`;

    // 發送請求到Ollama API
    const response = await axios.post(
      process.env.OLLAMA_API_URL + "/generate",
      {
        model: process.env.LLM_MODEL,
        prompt: prompt,
        stream: false,
      }
    );

    // 返回LLM回應
    const rawResponse = response.data.response;

    // 從回應中提取JSON命令
    let command = null;
    try {
      // 使用正則表達式尋找JSON對象
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        command = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Error parsing command:", error);
    }

    res.json({
      rawResponse,
      command,
    });
  } catch (error) {
    console.error("Error in LLM processing:", error);
    res.status(500).json({
      error: "Failed to process LLM request",
      details: error.message,
    });
  }
};
