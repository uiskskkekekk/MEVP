/**
 * 計算文字在特定字型大小和最大寬度下的顯示寬度
 * @param {string} text 要計算的文字
 * @param {number} fontSize 字型大小(px)
 * @param {number} maxWidth 最大寬度限制
 * @returns {number} 顯示寬度
 */
export function calculateTextWidth(text, fontSize, maxWidth) {
  if (!text) return 0;

  const width = Math.min(maxWidth, text.length);
  return width * fontSize * 0.60009765625;
}

export default calculateTextWidth;
