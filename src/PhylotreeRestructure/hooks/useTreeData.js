import { useCallback, useEffect, useState } from "react";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "../constants/treeConstants";
import { convertTreeToNewick, findNodeById } from "../utils/newickParser";

/**
 * 管理樹的數據狀態
 * @param {string} initialNewick - 初始Newick字串
 * @returns {Object} - 樹數據狀態和操作方法
 */
export function useTreeData(initialNewick) {
  const [tree, setTree] = useState(null);
  const [treeInstance, setTreeInstance] = useState(null);
  const [newick, setNewick] = useState(initialNewick || "");
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [renamedNodes, setRenamedNodes] = useState(new Map());
  const [merged, setMerged] = useState({});
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [dimensions, setDimensions] = useState({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const [clickedBranch, setClickedBranch] = useState(null);
  const [sort, setSort] = useState(null);
  const [alignTips, setAlignTips] = useState("left");
  const [internalLabels, setInternalLabels] = useState(false);

  // 當initialNewick變化時重置樹
  useEffect(() => {
    if (initialNewick && initialNewick !== newick) {
      setNewick(initialNewick);
      setTree(null);
      setTreeInstance(null);
      setCollapsedNodes(new Set());
      setRenamedNodes(new Map());
      setMerged({});
      setSort(null);
      setAlignTips("left");
      setInternalLabels(false);
      setClickedBranch(null);
    }
  }, [initialNewick, newick]);

  /**
   * 處理尺寸變化
   */
  const handleDimensionsChange = useCallback((newDimensions) => {
    setDimensions(newDimensions);
    setWidth(newDimensions.width);
    setHeight(newDimensions.height);
  }, []);

  /**
   * 處理樹實例準備完成
   */
  const handleTreeReady = useCallback((newTreeInstance) => {
    setTreeInstance(newTreeInstance);
  }, []);

  /**
   * 調整尺寸
   */
  const toggleDimension = useCallback((dimension, direction) => {
    if (dimension === "width") {
      setWidth((prev) => prev + (direction === "expand" ? 40 : -40));
    } else if (dimension === "height") {
      setHeight((prev) => prev + (direction === "expand" ? 40 : -40));
    }
  }, []);

  /**
   * 處理排序
   */
  const handleSort = useCallback((direction) => {
    setSort(direction);
  }, []);

  /**
   * 處理節點對齊
   */
  const alignTipsDirection = useCallback((direction) => {
    setAlignTips(direction);
  }, []);

  /**
   * 處理分支點擊
   */
  const handleBranchClick = useCallback((branch) => {
    setClickedBranch(branch.target.data.name);
  }, []);

  /**
   * 折疊或展開節點
   */
  const toggleNodeCollapse = useCallback((nodeId, isCollapsed) => {
    setCollapsedNodes((prev) => {
      const newCollapsed = new Set(prev);
      if (isCollapsed) {
        newCollapsed.delete(nodeId);
      } else {
        newCollapsed.add(nodeId);
      }
      return newCollapsed;
    });
  }, []);

  /**
   * 更新樹的 Newick 格式
   */
  const updateTree = useCallback(() => {
    if (!treeInstance) {
      console.log("樹實例尚未準備好");
      return;
    }

    try {
      // 轉換成 Newick 格式
      const updatedNewick = convertTreeToNewick(
        treeInstance.nodes,
        collapsedNodes,
        renamedNodes
      );
      console.log("更新後的 Newick:", updatedNewick);

      // 更新 newick 狀態
      setNewick(updatedNewick);
    } catch (error) {
      console.error("更新樹時出錯:", error);
    }
  }, [treeInstance, collapsedNodes, renamedNodes, convertTreeToNewick]);

  /**
   * 重命名節點
   */
  const handleNodeRename = useCallback(
    (nodeId, newName) => {
      console.log(`重命名節點 ${nodeId} 為 ${newName}`);

      // 檢查節點是否已折疊且尚未存入merged
      const isCollapsed = collapsedNodes.has(nodeId);
      const isInMerged = merged.hasOwnProperty(nodeId);

      // 檢查是否為空字串
      if (newName.trim() === "") {
        setRenamedNodes((prevRenamedNodes) => {
          const newRenamedNodes = new Map(prevRenamedNodes);
          newRenamedNodes.delete(nodeId);
          return newRenamedNodes;
        });

        // 處理折疊節點的重命名
        if (collapsedNodes.has(nodeId)) {
          updateTree();
        }
      } else {
        if (isCollapsed && !isInMerged && treeInstance) {
          // 找到對應的點
          const node = findNodeById(treeInstance, nodeId);

          if (node) {
            const siblings = node.parent.children;

            const childrenIds = new Set();
            const collectChildrenIds = (childNode) => {
              if (!childNode) return;

              if (childNode.unique_id && childNode !== node) {
                childrenIds.add(childNode.unique_id);
              }

              if (childNode.children) {
                childNode.children.forEach(collectChildrenIds);
              }
            };

            // 收集子節點ID
            if (node.children) {
              node.children.forEach(collectChildrenIds);
            }

            let nodeIndex = -1;
            for (let i = 0; i < siblings.length; i++) {
              if (siblings[i].unique_id === node.unique_id) {
                nodeIndex = i;
                break;
              }
            }

            // 為了保證狀態更新的順序，使用函數式更新
            setMerged((prevMerged) => {
              const newMerged = { ...prevMerged };
              newMerged[nodeId] = {
                children: childrenIds,
                subtreeNewick: convertTreeToNewick(node, new Set(), new Map()),
                rename: newName,
                parent: node.parent.unique_id,
                siblingIndex: nodeIndex,
              };
              console.log(newMerged);
              return newMerged;
            });

            setRenamedNodes((prevRenamedNodes) => {
              const newRenamedNodes = new Map(prevRenamedNodes);
              newRenamedNodes.set(nodeId, newName);
              return newRenamedNodes;
            });

            updateTree();

            return;
          }
        }

        // 如果不需要更新 merged，只需要更新 renamedNodes
        setRenamedNodes((prevRenamedNodes) => {
          const newRenamedNodes = new Map(prevRenamedNodes);
          newRenamedNodes.set(nodeId, newName);
          return newRenamedNodes;
        });
      }
    },
    [collapsedNodes, merged, treeInstance, convertTreeToNewick, updateTree]
  );

  /**
   * 按閾值折疊節點
   */
  const handleThresholdCollapse = useCallback(
    (threshold) => {
      // group merge
      if (!treeInstance) return;

      // 獲取所有需要折疊的節點 ID
      setCollapsedNodes((prev) => {
        const nodesToCollapse = new Set(prev);

        const traverseNodes = (node, hasParentCollapsed = false) => {
          if (!node) return;

          let shouldCollapseThisNode = false;

          if (!hasParentCollapsed) {
            if (node.children && node.children.length > 0) {
              if (node.data.abstract_x >= threshold) {
                nodesToCollapse.add(node.unique_id);
                shouldCollapseThisNode = true;
              }
            }
          }

          if (node.children) {
            node.children.forEach((child) =>
              traverseNodes(child, hasParentCollapsed || shouldCollapseThisNode)
            );
          }
        };

        if (treeInstance.nodes) {
          traverseNodes(treeInstance.nodes);
        }

        return nodesToCollapse;
      });
    },
    [treeInstance]
  );

  /**
   * 切換內部標籤顯示
   */
  const toggleInternalLabels = useCallback(() => {
    setInternalLabels((prev) => !prev);
  }, []);

  return {
    tree,
    treeInstance,
    newick,
    collapsedNodes,
    renamedNodes,
    merged,
    width,
    height,
    dimensions,
    clickedBranch,
    sort,
    alignTips,
    internalLabels,
    handleDimensionsChange,
    handleTreeReady,
    toggleDimension,
    handleSort,
    alignTipsDirection,
    handleBranchClick,
    toggleNodeCollapse,
    handleNodeRename,
    handleThresholdCollapse,
    toggleInternalLabels,
    updateTree,
    setWidth,
    setHeight,
  };
}
