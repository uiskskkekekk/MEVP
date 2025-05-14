import { useCallback } from "react";
import { convertTreeToNewick } from "../utils/newickParser";

/**
 * 提供樹資料匯出功能
 * @param {Object} treeInstance - 樹實例
 * @param {Set} collapsedNodes - 折疊節點集合
 * @param {Map} renamedNodes - 重命名節點映射
 * @returns {Object} - 匯出功能方法
 */
export function useExportFunctions(treeInstance, collapsedNodes, renamedNodes) {
  /**
   * 匯出修改後的Newick格式
   */
  const exportModifiedNewick = useCallback(() => {
    if (!treeInstance) {
      alert("No tree data available to export.");
      return;
    }

    try {
      // 將樹轉換為 Newick 格式，同時處理折疊和重命名的節點
      const exportNewick = convertTreeToNewick(
        treeInstance.nodes,
        collapsedNodes,
        renamedNodes
      );

      // 創建下載連結
      const element = document.createElement("a");
      const file = new Blob([exportNewick], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = "exported_tree.nwk";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("處理過程中出錯:", error);
    }
  }, [treeInstance, collapsedNodes, renamedNodes]);

  /**
   * 匯出樹為圖片
   */
  const exportTreeAsImage = useCallback(() => {
    const scaleFactor = 5;

    const svgElement = document.querySelector(".tree_container svg");
    if (!svgElement) {
      alert("無法找到 SVG 元素");
      return;
    }

    // 創建 SVG 的副本
    const svgClone = svgElement.cloneNode(true);

    // 設置白色背景
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "white");
    svgClone.insertBefore(rect, svgClone.firstChild);

    // 將 SVG 轉換為字符串
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // 創建 Blob
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // 創建 Image 對象
    const img = new Image();

    img.onload = () => {
      // 創建 canvas，使用縮放因子提高解析度
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.width.baseVal.value * scaleFactor;
      canvas.height = svgElement.height.baseVal.value * scaleFactor;

      // 在 canvas 上繪製圖像
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      // 轉換為圖片 URL
      try {
        const imgURL = canvas.toDataURL("image/png");

        // 創建下載鏈接
        const downloadLink = document.createElement("a");
        downloadLink.download = "phylotree.png";
        downloadLink.href = imgURL;
        downloadLink.click();

        // 清理
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("導出圖片時出錯：", e);
        alert(
          "導出圖片失敗，可能是由於瀏覽器安全限制。請嘗試較小的樹或降低解析度。"
        );
      }
    };

    img.onerror = () => {
      console.error("無法從 SVG 創建圖像");
      URL.revokeObjectURL(url);
      alert("無法創建圖像。請檢查控制台獲取更多信息。");
    };

    // 設置圖像源並開始加載
    img.src = url;
  }, []);

  return {
    exportModifiedNewick,
    exportTreeAsImage,
  };
}
