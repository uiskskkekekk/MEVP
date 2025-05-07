const axios = require("axios");

exports.processLLMRequest = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: "Missing query parameter",
      });
    }

    const prompt = `You are a command parser. Convert user input: "${query}" into a JSON command.

    Strictly follow these rules:
    1. Return only valid JSON, without any additional text
    2. If unable to parse as a known command, return {"action":"unknown","target":"unknown"}
    3. All parameters must be appropriate data types

    Supported command format:
    {"action":"action type","target":"phylotree","parameters":{"parameter name":parameter value}}

    target:
    - phylotree

    Supported actions:
    - adjustWidth (parameters:width [NUMBER]): 調整系統發育樹視圖的寬度，以像素為單位。例如，設置為800像素可使樹視圖具有適當的水平空間。

    - adjustHeight (parameters:height [NUMBER]): 調整系統發育樹視圖的高度，以像素為單位。增加高度可在分支較多時提供更好的垂直間距。

    - adjustSize (parameters:width [NUMBER],height [NUMBER]): 同時調整系統發育樹視圖的寬度和高度，以像素為單位。這可以一次性調整整個視圖的尺寸比例。

    - thresholdCollapse (parameters:threshold [NUMBER]): 根據分支長度自動折疊節點。當節點的分支長度大於或等於指定閾值時，該節點及其子節點將被折疊。這對於簡化具有長分支的複雜樹非常有用。`;

    // 發送請求到Ollama API
    const response = await axios.post(
      process.env.OLLAMA_API_URL + "/generate",
      {
        model: process.env.LLM_MODEL,
        prompt: prompt,
        stream: false,
      }
    );

    const rawResponse = response.data.response;

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
