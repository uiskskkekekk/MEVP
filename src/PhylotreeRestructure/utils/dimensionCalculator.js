import {
  MIN_HORIZONTAL_SPACING,
  MIN_VERTICAL_SPACING,
} from "../constants/treeConstants";
import { calculateTextWidth } from "./textUtils";

/**
 * 計算樹的最佳顯示尺寸
 * @param {Object} tree - 系統發生樹物件
 * @param {boolean} showLabels - 是否顯示標籤
 * @returns {Object} - 最佳寬度和高度
 */
export function calculateOptimalDimensions(tree, showLabels = true) {
  const leafNodes = tree.getTips();
  const minVerticalSpacing = MIN_VERTICAL_SPACING;

  const optimalHeight = leafNodes.length * minVerticalSpacing;

  let maxPathLength = 0;
  let maxLabelWidth = 0;

  tree.traverse_and_compute((node) => {
    if (node.data.abstract_x > maxPathLength) {
      maxPathLength = node.data.abstract_x;
    }
    if (node.data.name) {
      const labelWidth = calculateTextWidth(node.data.name, 14, 100);
      if (labelWidth > maxLabelWidth) {
        maxLabelWidth = labelWidth;
      }
    }
  });

  const minHorizontalSpacing = MIN_HORIZONTAL_SPACING;
  const optimalWidth =
    maxPathLength * minHorizontalSpacing + maxLabelWidth + 100;

  return {
    width: Math.max(300, Math.round(optimalWidth)),
    height: Math.max(300, Math.round(optimalHeight)),
  };
}

/**
 * 為節點附加文字寬度資訊
 * @param {Object} node - 樹節點
 * @param {number} fontSize - 字型大小
 * @param {number} maxLabelWidth - 最大標籤寬度
 */
export function attachTextWidthToNodes(
  node,
  fontSize = 14,
  maxLabelWidth = 20
) {
  node.data.text_width = calculateTextWidth(
    node.data.name,
    fontSize,
    maxLabelWidth
  );
  if (node.children)
    node.children.forEach((child) =>
      attachTextWidthToNodes(child, fontSize, maxLabelWidth)
    );
}
