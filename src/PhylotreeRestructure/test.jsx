import { scaleLinear } from "d3-scale";
import { phylotree } from "phylotree";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import calculateTextWidth from "../../utils/textUtils.js";
import {
    collectInternalNodes,
    getHiddenBranches,
    shouldHideInternalNode,
} from "../../utils/treeUtils.js";
import BranchLengthAxis from "../axes/BranchLengthAxis.jsx";
import Branch from "../nodes/Branch.jsx";
import InternalNode from "../nodes/InternalNode.jsx";
import NodeLabel from "../nodes/NodeLabel.jsx";

import "../../styles/phylotree.css";

// 使用常量替代魔術數字
const MIN_VERTICAL_SPACING = 20;
const MIN_HORIZONTAL_SPACING = 25;
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const BRANCH_LENGTH_AXIS_HEIGHT = 90;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_LABEL_PADDING = 100;

// 類型定義 (JSDoc)
/**
 * @typedef {Object} TreeNode
 * @property {string} name - Node name
 * @property {number} abstract_x - X position
 * @property {number} abstract_y - Y position
 * @property {any} data - Node data
 * @property {Array<TreeNode>} [children] - Child nodes
 */

/**
 * 默認分支長度存取器函數
 * @param {TreeNode} node - 樹節點
 * @returns {number} - 分支長度
 */
const defaultAccessor = (node) => {
  return +node.data.attribute; //「+」的作用是將其後面的node.data.attribute轉換為數字
};

/**
 * 有分支長度情況下的X座標計算
 * @param {TreeNode} node - 樹節點
 * @param {Function} accessor - 分支長度存取器
 * @returns {number} - 計算後的X座標
 */
const xBranchLengths = (node, accessor) => {
  if (!node.parent) return 0;
  const branchLength = accessor(node);
  return branchLength + node.parent.data.abstract_x;
};

/**
 * 無分支長度情況下的X座標計算
 * @param {TreeNode} node - 樹節點
 * @returns {number} - 計算後的X座標
 */
const xNoBranchLengths = (node) => {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
};

/**
 * 將節點設為非葉節點
 * @param {Object} tree - 系統發生樹物件
 * @param {TreeNode} node - 樹節點
 */
const setNodeAsNonLeaf = (tree, node) => {
  if (tree.isLeafNode(node)) {
    node.children = [];
  }
};

/**
 * 為節點分配閾值ID
 * @param {Object} tree - 系統發生樹物件
 * @param {Set<string>} mergedChildrenIds - 已合併節點的ID集合
 * @returns {Map} - 閾值分組
 */
const assignThresholdIds = (tree, mergedChildrenIds) => {
  const currentThresholdGroups = new Map();

  // 收集所有要被分配 threshold id 的 node
  tree.traverse_and_compute((node) => {
    if (!tree.isLeafNode(node)) {
      const threshold = node.data.abstract_x;

      if (!currentThresholdGroups.has(threshold)) {
        currentThresholdGroups.set(threshold, []);
      }

      currentThresholdGroups.get(threshold).push(node);
    }
    return true;
  });

  // 為每個 threshold 組中的節點分配 ID，保留原有 ID 模式
  for (const [threshold, nodes] of currentThresholdGroups.entries()) {
    // 按 y 值排序
    nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);

    // 獲取該 threshold 下的原有 ID 列表
    const originalIds = tree.thresholdIdMap[threshold] || [];

    // 跳過在 mergedChildrenIds 中的 ID
    const availableIds = originalIds.filter((id) => !mergedChildrenIds.has(id));

    // 為節點分配 ID，使用可用的原有 ID
    nodes.forEach((node, index) => {
      if (index < availableIds.length) {
        node.unique_id = String(availableIds[index]);
      }
    });
  }

  return currentThresholdGroups;
};

// 持久化的閾值ID映射
let persistentThresholdIdMap = {};

/**
 * 計算節點位置並分配ID
 * @param {Object} tree - 系統發生樹物件
 * @param {boolean} performInternalLayout - 是否執行內部節點布局
 * @param {Function} accessor - 分支長度存取器
 * @param {string} sort - 排序方向
 * @param {Object} mergedNodes - 已合併節點信息
 */
const placeNodes = (
  tree,
  performInternalLayout,
  accessor = defaultAccessor,
  mergedNodes = {}
) => {

  let currentLeafHeight = -1;
  let uniqueId = 0;
  tree.max_x = 0;

  const hasBranchLengths = Boolean(accessor(tree.getTips()[0]));
  const xBranchLength = hasBranchLengths ? xBranchLengths : xNoBranchLengths;

  // 第一階段：計算節點位置，為葉節點分配普通的unique_id
  // 節點布局函數 - 標準模式
  const nodeLayout = (node) => {
    if (!node.children || node.children.length === 0) {
      uniqueId = node.unique_id = uniqueId + 1;
    }

    node.data.abstract_x = xBranchLength(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);

    if (node.children) {
      node.data.abstract_y = node.children.map(nodeLayout).reduce((a, b) => a + b, 0) / node.children.length;
    } else {
      currentLeafHeight = node.data.abstract_y = currentLeafHeight + 1;
    }
    return node.data.abstract_y;
  };

  // 節點布局函數 - 內部節點模式
  const internalNodeLayout = (node) => {
    if (!node.children || node.children.length === 0) {
      uniqueId = node.unique_id = uniqueId + 1;
    }

    node.data.abstract_x = xBranchLength(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);

    if (!tree.isLeafNode(node)) {
      node.children.forEach(internalNodeLayout);
    }

    if (!node.data.abstract_y && node.data.name !== "root") {
      currentLeafHeight = node.data.abstract_y = currentLeafHeight + 1;
      tree.node_order.push(node.data.name);
    }

    if (node.parent && !node.parent.data.abstract_y && node.data.name !== "root") {
      if (node.parent.data.name !== "root") {
        currentLeafHeight = node.parent.data.abstract_y = currentLeafHeight + 1;
        tree.node_order.push(node.parent.data.name);
      }
    }

    tree.max_y = Math.max(tree.max_y, currentLeafHeight);
  };

  // 執行位置計算
  if (performInternalLayout) {
    tree.max_y = 0;
    tree.node_order = [];
    internalNodeLayout(tree.nodes);
    
    const root = tree.getNodeByName("root");
    if (root && root.children && root.children.length) {
      root.data.abstract_y = root.children
        .map((child) => child.data.abstract_y)
        .reduce((a, b) => a + b, 0) / root.children.length;
    }
  } else {
    nodeLayout(tree.nodes);
    tree.max_y = currentLeafHeight;
  }

  // 閾值分組
  const thresholdGroups = new Map();

  // 收集所有內部節點並按閾值分組
  const collectInternalNodesForGroup = (node) => {
    if (!node) return;

    if (!tree.isLeafNode(node)) {
      const threshold = node.data.abstract_x;

      if (!thresholdGroups.has(threshold)) {
        thresholdGroups.set(threshold, []);
      }

      thresholdGroups.get(threshold).push(node);
    }

    if (node.children) {
      node.children.forEach(collectInternalNodesForGroup);
    }
  };

  collectInternalNodesForGroup(tree.nodes);

  // 處理閾值ID分配
  const isFirstRender = Object.keys(mergedNodes).length === 0 && 
                      Object.keys(persistentThresholdIdMap).length === 0;
  
  if (Object.keys(mergedNodes).length === 0) {
    persistentThresholdIdMap = {};
  }

  tree.thresholdIdMap = persistentThresholdIdMap;

  if (isFirstRender) {
    // 首次渲染，為每個閾值組分配新ID
    for (const [threshold, nodes] of thresholdGroups.entries()) {
      nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);
      nodes.forEach((node, index) => {
        node.unique_id = `${threshold}-${index}`;
      });
    }

    const thresholdIdMap = {};

    tree.traverse_and_compute((node) => {
      if (!tree.isLeafNode(node) && typeof node.unique_id === "string") {
        const idStr = String(node.unique_id);
        const [threshold] = idStr.split("-");

        if (!thresholdIdMap[threshold]) {
          thresholdIdMap[threshold] = [];
        }

        thresholdIdMap[threshold].push(node.unique_id);
      }
      return true;
    });

    persistentThresholdIdMap = thresholdIdMap;
  } else {
    // 非首次渲染，處理已合併節點
    const mergedChildrenIds = new Set();
    const mergedIds = {};

    for (const mergedId in mergedNodes) {
      mergedIds[mergedId] = {
        parent: mergedNodes[mergedId].parent,
        siblingIndex: mergedNodes[mergedId].siblingIndex,
      };

      const mergedInfo = mergedNodes[mergedId];
      if (mergedInfo.children) {
        for (const childId of mergedInfo.children) {
          mergedChildrenIds.add(childId);
        }
      }
    }

    assignThresholdIds(tree, mergedChildrenIds);

    // 輔助函數: 提取閾值
    const extractThreshold = (id) => {
      const parts = id.split("-");
      return parseInt(parts[0], 10);
    };

    // 輔助函數: 提取y值
    const extractYValue = (id) => {
      const parts = id.split("-");
      return parseInt(parts[1], 10);
    };

    // 排序合併ID
    const sortedMergedIds = Object.entries(mergedIds).sort((a, b) => {
      const thresholdA = extractThreshold(a[0]);
      const thresholdB = extractThreshold(b[0]);

      if (thresholdA !== thresholdB) {
        return thresholdA - thresholdB;
      }

      return extractYValue(a[0]) - extractYValue(b[0]);
    });

    // 處理已排序的合併ID
    for (const [mergedId, mergedInfo] of sortedMergedIds) {
      const parentNode = findNodeById(tree, mergedInfo.parent);

      if (parentNode && parentNode.children) {
        const siblings = parentNode.children;
        const nodeToModify = siblings[mergedInfo.siblingIndex];

        if (nodeToModify) {
          setNodeAsNonLeaf(tree, nodeToModify);
          assignThresholdIds(tree, mergedChildrenIds);
        }
      }
    }
  }
};

/**
 * 通過ID查找節點
 * @param {Object} tree - 系統發生樹物件
 * @param {string} id - 節點ID
 * @returns {TreeNode|null} - 找到的節點或null
 */
const findNodeById = (tree, id) => {
  let foundNode = null;
  tree.traverse_and_compute((node) => {
    if (node.unique_id === id) {
      foundNode = node;
      return false; // 停止遍歷
    }
    return true;
  });
  return foundNode;
};

/**
 * 計算最佳畫布尺寸
 * @param {Object} tree - 系統發生樹物件
 * @param {boolean} showLabels - 是否顯示標籤
 * @returns {{width: number, height: number}} - 最佳尺寸
 */
const calculateOptimalDimensions = (tree) => {
  const leafNodes = tree.getTips();
  const optimalHeight = Math.max(300, leafNodes.length * MIN_VERTICAL_SPACING);

  let maxPathLength = 0;
  let maxLabelWidth = 0;

  tree.traverse_and_compute((node) => {
    if (node.data.abstract_x > maxPathLength) {
      maxPathLength = node.data.abstract_x;
    }
    if (node.data.name) {
      const labelWidth = calculateTextWidth(node.data.name, DEFAULT_FONT_SIZE, 100);
      if (labelWidth > maxLabelWidth) {
        maxLabelWidth = labelWidth;
      }
    }
    return true;
  });

  const optimalWidth = Math.max(300, 
    maxPathLength * MIN_HORIZONTAL_SPACING + maxLabelWidth + DEFAULT_LABEL_PADDING);

  return {
    width: Math.round(optimalWidth),
    height: Math.round(optimalHeight),
  };
};

/**
 * Phylotree 組件
 * @param {Object} props - 組件屬性
 */
function Phylotree(props) {
  const [tooltip, setTooltip] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [nodeLabels, setNodeLabels] = useState(new Map());
  const [dimensions, setDimensions] = useState(null);
  const [hoveredTick, setHoveredTick] = useState(null);

  const svgRef = useRef(null);
  const { 
    maxLabelWidth, 
    collapsedNodes, 
    renamedNodes, 
    onNodeRename,
    tree: propTree,
    newick,
    skipPlacement,
    internalNodeLabels,
    accessor,
    sort,
    merged,
    onTreeReady,
    onDimensionsChange,
    showLabels,
    width,
    height,
    transform,
    includeBLAxis,
    highlightBranches,
    alignTips,
    branchStyler,
    labelStyler,
    tooltip: tooltipProp,
    onBranchClick,
    onContextMenuEvent
  } = props;

  // 建立樹物件
  const tree = useMemo(() => {
    if (propTree) return propTree;
    if (newick) return new phylotree(newick);
    return null;
  }, [propTree, newick]);

  // 處理節點點擊
  const handleNodeClick = useCallback((e, id, nodeInfo) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onContextMenuEvent) return;

    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isNodeCollapsed = collapsedNodes && collapsedNodes.has(id);

    onContextMenuEvent({
      visible: true,
      position: { x, y },
      nodeId: id,
      nodeData: nodeInfo,
      isNodeCollapsed,
    });
  }, [onContextMenuEvent, collapsedNodes]);

  // 處理標籤變更
  const handleLabelChange = useCallback((id, newLabel) => {
    setNodeLabels(prev => {
      const newLabels = new Map(prev);
      newLabels.set(id, newLabel);
      return newLabels;
    });

    if (onNodeRename) {
      onNodeRename(id, newLabel);
    }
  }, [onNodeRename]);

  // 節點布局計算
  useEffect(() => {
    if (!tree || skipPlacement) return;

    placeNodes(tree, internalNodeLabels, accessor, sort, merged);

    if (onTreeReady) {
      onTreeReady(tree);
    }

    const optimalDims = calculateOptimalDimensions(tree, showLabels);
    
    if (!dimensions || 
        dimensions.width !== optimalDims.width || 
        dimensions.height !== optimalDims.height) {
      setDimensions(optimalDims);
      
      if (onDimensionsChange) {
        onDimensionsChange(optimalDims);
      }
    }
  }, [
    tree, 
    skipPlacement, 
    internalNodeLabels, 
    accessor, 
    sort, 
    merged, 
    onTreeReady, 
    showLabels, 
    collapsedNodes, 
    onDimensionsChange, 
    dimensions
  ]);

  // 如果沒有樹數據，則不渲染
  if (!tree) return <g />;

  // 確保節點位置正確
  if (!skipPlacement) {
    placeNodes(tree, internalNodeLabels, accessor, sort, merged);
  }

  // 確定實際尺寸
  const actualWidth = width || (dimensions ? dimensions.width : DEFAULT_WIDTH);
  const actualHeight = height || (dimensions ? dimensions.height : DEFAULT_HEIGHT);

  // 附加標籤寬度信息
  const attachTextWidth = (node) => {
    node.data.calculateTextWidth = calculateTextWidth(node.data.name, DEFAULT_FONT_SIZE, maxLabelWidth);
    if (node.children) node.children.forEach(attachTextWidth);
  };
  attachTextWidth(tree.nodes);

  // 計算標籤位置
  const sortedTips = tree.getTips().sort((a, b) => b.data.abstract_x - a.data.abstract_x);
  let rightmost = actualWidth;

  if (showLabels) {
    for (let i = 0; i < sortedTips.length; i++) {
      const tip = sortedTips[i];
      rightmost = actualWidth - tip.data.calculateTextWidth;
      const scale = rightmost / tip.data.abstract_x;
      
      const noneCross = sortedTips.every(tip => {
        const tipX = tip.data.abstract_x * scale;
        const textX = actualWidth - tip.data.calculateTextWidth;
        return Math.floor(tipX) < Math.ceil(textX);
      });
      
      if (noneCross) break;
    }
  }

  // 創建比例尺
  const xScale = scaleLinear()
    .domain([0, tree.max_x])
    .range([0, rightmost]);
  
  const yScale = scaleLinear()
    .domain([0, tree.max_y])
    .range([includeBLAxis ? BRANCH_LENGTH_AXIS_HEIGHT : 0, actualHeight]);

  // 獲取隱藏分支和內部節點
  const hiddenBranches = getHiddenBranches(tree, collapsedNodes);
  const internalNodes = collectInternalNodes(tree);

  return (
    <g ref={svgRef} transform={transform}>
      {includeBLAxis && (
        <BranchLengthAxis
          maxX={tree.max_x}
          x_scale={xScale}
          rightmost={rightmost}
          hoveredTick={hoveredTick}
          setHoveredTick={setHoveredTick}
          onThresholdCollapse={props.onThresholdCollapse}
        />
      )}

      {tree.links
        .filter(link => !hiddenBranches.has(link.target.unique_id))
        .map((link, index) => (
          <Branch
            key={`branch-${link.source.unique_id}-${link.target.unique_id}-${index}`}
            xScale={xScale}
            yScale={yScale}
            colorScale={props.highlightBranches}
            link={link}
            showLabel={internalNodeLabels || tree.isLeafNode(link.target)}
            maxLabelWidth={maxLabelWidth}
            width={actualWidth}
            alignTips={alignTips}
            branchStyler={branchStyler}
            labelStyler={labelStyler}
            tooltip={tooltipProp}
            setTooltip={setTooltip}
            onClick={onBranchClick}
            isCollapsed={collapsedNodes && collapsedNodes.has(link.target.unique_id)}
          />
        ))}

      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <InternalNode
            key={`internal-${id}`}
            id={id}
            x={xScale(nodeInfo.x)}
            y={yScale(nodeInfo.y)}
            isHovered={hoveredNode === id}
            onNodeClick={(e) => handleNodeClick(e, id, nodeInfo)}
            onMouseEnter={() => setHoveredNode(id)}
            onMouseLeave={() => setHoveredNode(null)}
          />
        ))}

      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <NodeLabel
            key={`label-${id}`}
            id={id}
            x={xScale(nodeInfo.x)}
            y={yScale(nodeInfo.y) + 5}
            isCollapsed={collapsedNodes && collapsedNodes.has(id)}
            label={nodeLabels.get(id)}
            onLabelChange={handleLabelChange}
            internalNodeLabels={internalNodeLabels}
            onNodeRename={onNodeRename}
          />
        ))}
    </g>
  );
}

// 默認屬性
Phylotree.defaultProps = {
  showLabels: true,
  skipPlacement: false,
  maxLabelWidth: 20,
  alignTips: "left",
  accessor: defaultAccessor,
  branchStyler: null,
  labelStyler: null,
  tooltip: null,
  sort: null,
  includeBLAxis: false,
  onBranchClick: () => null,
  onContextMenuEvent: null,
  onNodeClick: null,
  collapsedNodes: new Set(),
  renamedNodes: new Map(),
  onNodeRename: null,
};

export default Phylotree;
export { calculateOptimalDimensions, placeNodes };
