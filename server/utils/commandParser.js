// 解析LLM回應為命令
exports.parseToCommand = (text) => {
  try {
    // 嘗試直接解析JSON
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 如果沒有JSON，進行文字解析
    // 這部分可以根據您的需求自定義
    const defaultCommand = {
      action: "unknown",
      target: "general",
      parameters: {},
    };

    // 簡單的關鍵詞解析
    if (text.includes("旋轉") || text.includes("rotate")) {
      defaultCommand.action = "rotate";
      // 嘗試提取角度
      const angleMatch = text.match(/(\d+)度|(\d+)°|(\d+) degrees/);
      if (angleMatch) {
        defaultCommand.parameters.angle = parseInt(
          angleMatch[1] || angleMatch[2] || angleMatch[3]
        );
      }
    } else if (text.includes("縮放") || text.includes("zoom")) {
      defaultCommand.action = "zoom";
      defaultCommand.parameters.factor = text.includes("放大") ? 1.5 : 0.7;
    }

    return defaultCommand;
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    return {
      action: "error",
      target: "system",
      parameters: { error: error.message },
    };
  }
};
