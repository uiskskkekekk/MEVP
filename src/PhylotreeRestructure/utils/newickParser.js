import { phylotree } from "phylotree";

/**
 * 將樹結構轉換為Newick格式
 * @param {Object} node - 樹節點
 * @param {Set} collapsedNodes - 折疊節點集合
 * @param {Map} renamedNodes - 重命名節點映射
 * @param {number} depth - 當前深度 (用於遞迴)
 * @returns {string} - Newick格式字串
 */
export function convertTreeToNewick(
  node,
  collapsedNodes,
  renamedNodes,
  depth = 0
) {
  if (node.unique_id && collapsedNodes.has(node.unique_id)) {
    // 節點是否被折疊
    if (renamedNodes.has(node.unique_id)) {
      // 如果節點被折疊且有重命名，使用新名稱
      const newName = renamedNodes.get(node.unique_id);
      const branchLength = node.data.attribute ? `:${node.data.attribute}` : ""; // 是否有分支長度

      // 是否需要引號（如果新名稱包含特殊字符）
      const needQuotes = /[,;:()\[\]]/g.test(newName);
      if (needQuotes) {
        return `'${newName}'${branchLength}`;
      } else {
        return `${newName}${branchLength}`;
      }
    }
  }

  // 如果是葉子節點（沒有子節點）
  if (!node.children || node.children.length === 0) {
    const name = node.data.name || "";
    const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";

    // 檢查是否需要引號
    const needQuotes = /[,;:()\[\]]/g.test(name);
    if (needQuotes) {
      return `'${name}'${branchLength}`;
    } else {
      return `${name}${branchLength}`;
    }
  }

  // 處理內部節點
  const childrenNewick = node.children
    .map((child) =>
      convertTreeToNewick(child, collapsedNodes, renamedNodes, depth + 1)
    )
    .join(",");

  // 是否有節點名稱
  const name = node.data.name || "";
  const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";

  // 根節點
  if (depth === 0) {
    return `(${childrenNewick})${name}${branchLength};`;
  }

  // 其他內部節點
  return `(${childrenNewick})${name}${branchLength}`;
}

/**
 * 根據ID查找節點
 * @param {Object} tree - 樹物件
 * @param {string} nodeId - 節點ID
 * @returns {Object|null} - 找到的節點或null
 */
export function findNodeById(tree, nodeId) {
  let foundNode = null;
  tree.traverse_and_compute((node) => {
    if (node.unique_id === nodeId) {
      foundNode = node;
      return false; // 停止遍歷
    }
    return true;
  });
  return foundNode;
}

/**
 * 解析Newick字符串为树结构
 * @param {string} newickString - Newick格式字符串
 * @returns {Object} 解析后的树结构
 */
export const parseNewick = (newickString) => {
  if (!newickString) return null;
  try {
    return new phylotree(newickString);
  } catch (error) {
    console.error("解析Newick字符串时出错:", error);
    return null;
  }
};
