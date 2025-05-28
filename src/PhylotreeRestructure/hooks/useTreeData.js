// hooks/useTreeData.js
import { phylotree } from "phylotree";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "../constants/treeConstants";
import { convertTreeToNewick } from "../utils/newickParser";

/**
 * 管理樹的數據狀態
 * @param {string} initialNewick - 初始Newick字串
 * @returns {Object} - 樹數據狀態和操作方法
 */
export function useTreeData(initialNewick) {
  console.log("🚀 useTreeData Hook 初始化，initialNewick:", initialNewick);

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
  const [shouldUpdateTree, setShouldUpdateTree] = useState(false);

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

  useEffect(() => {
    console.log("🔍 Custom Hook - merged 狀態變化:");
    console.log("  📊 merged keys:", Object.keys(merged));
    console.log("  📊 merged 內容:", merged);
    console.log("  📊 collapsedNodes size:", collapsedNodes.size);
    console.log("  📊 renamedNodes size:", renamedNodes.size);
  }, [merged, collapsedNodes, renamedNodes]);

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
   * 根据ID查找节点
   * @param {Object} rootNode - 根节点
   * @param {string} nodeId - 要查找的节点ID
   * @returns {Object|null} 找到的节点或null
   */
  const findNodeById = useCallback((rootNode, nodeId) => {
    if (!rootNode) return null;
    if (rootNode.unique_id === nodeId) return rootNode;

    if (rootNode.children) {
      for (const child of rootNode.children) {
        const found = findNodeById(child, nodeId);
        if (found) return found;
      }
    }

    return null;
  }, []);

  /**
   * 更新樹的 Newick 格式
   */
  const updateTree = useCallback(() => {
    console.log("🌳 === updateTree 開始 ===");
    console.log("  🌳 treeInstance:", !!treeInstance);
    console.log("  🌳 當前 merged:", merged);
    console.log("  🌳 當前 collapsedNodes:", Array.from(collapsedNodes));
    console.log("  🌳 當前 renamedNodes:", Array.from(renamedNodes.entries()));

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
  }, [treeInstance, collapsedNodes, renamedNodes]);

  useEffect(() => {
    if (shouldUpdateTree) {
      console.log("🔄 所有狀態更新完成，現在執行 updateTree");
      console.log("  當前 merged:", merged);
      console.log("  當前 renamedNodes:", Array.from(renamedNodes.entries()));

      updateTree();
      setShouldUpdateTree(false); // 重置觸發器
    }
  }, [shouldUpdateTree]);

  /**
   * 替換節點為子樹
   * @param {Object} tree - 樹實例
   * @param {string} leafNodeId - 葉節點ID
   * @param {string} newNewick - 新的Newick字串
   * @returns {string|null} 更新後的Newick字串或null
   */
  const replaceNodeWithSubtree = useCallback((tree, leafNodeId, newNewick) => {
    console.log("開始替換節點，ID:", leafNodeId, "新Newick:", newNewick);

    // 找到要替換的葉節點
    let targetNode = null;
    tree.traverse_and_compute((node) => {
      if (node.unique_id === leafNodeId) {
        targetNode = node;
        console.log("找到目標節點:", targetNode);
        return false;
      }
      return true;
    });

    if (!targetNode) {
      console.error("找不到目標節點");
      return null;
    }

    // 解析新的 Newick 字符串成树结构
    const subtree = new phylotree(newNewick);

    // 找到要替换的节点在父节点的子节点列表中的位置
    const parentNode = targetNode.parent;
    if (!parentNode) {
      console.error("目標節點沒有父節點，無法替換");
      return null;
    }

    const indexInParent = parentNode.children.findIndex(
      (child) => child.unique_id === targetNode.unique_id
    );

    if (indexInParent === -1) {
      console.error("無法在父節點的子節點列表中找到目標節點");
      return null;
    }

    // 替換父節點的子節點列表中的目標節點
    const subtreeRoot = subtree.nodes;
    subtreeRoot.parent = parentNode;
    subtreeRoot.data.attribute = targetNode.data.attribute;
    parentNode.children[indexInParent] = subtreeRoot;

    // 轉換回完整的 Newick 字串
    const updatedNewick = convertTreeToNewick(
      tree.nodes,
      new Set(), // 注意：这里使用空的折叠集合，因为我们想生成完整展开的 Newick
      new Map() // 同样使用空的重命名映射
    );

    console.log("更新後的 Newick: ", updatedNewick);
    return updatedNewick;
  }, []);

  /**
   * 折疊或展開節點
   * @param {string} nodeId - 節點ID
   * @param {boolean} isNodeCollapsed - 節點是否已折疊
   */
  const toggleNodeCollapse = useCallback(
    (nodeId, isNodeCollapsed) => {
      if (!nodeId) return;

      if (isNodeCollapsed) {
        // 展開節點 (Unmerge)
        setCollapsedNodes((prev) => {
          const newCollapsed = new Set(prev);
          newCollapsed.delete(nodeId);
          return newCollapsed;
        });

        // 如果有存储的子树信息，还原其结构
        if (merged[nodeId] && treeInstance) {
          const subtreeNewick = merged[nodeId].subtreeNewick;

          try {
            const updatedNewick = replaceNodeWithSubtree(
              treeInstance,
              nodeId,
              subtreeNewick
            );

            if (updatedNewick) {
              // 更新合并信息
              setMerged((prev) => {
                const newMerged = { ...prev };
                delete newMerged[nodeId];
                return newMerged;
              });

              // 更新 Newick 字符串并强制重新创建树实例
              setNewick(updatedNewick);
              setTree(null);
              setTreeInstance(null);
            }
          } catch (error) {
            console.error("展開節點錯誤:", error);
          }
        }
      } else {
        // 折疊節點 (Merge)
        if (treeInstance) {
          const node = findNodeById(treeInstance.nodes, nodeId);

          if (node && node.children && node.children.length > 0) {
            // 收集子节点信息
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

            // 收集所有子节点ID
            node.children.forEach(collectChildrenIds);

            // 获取子树的 Newick 表示
            const subtreeNewick = convertTreeToNewick(
              node,
              new Set(),
              new Map()
            );

            // 获取父节点中的位置
            let siblingIndex = -1;
            if (node.parent) {
              for (let i = 0; i < node.parent.children.length; i++) {
                if (node.parent.children[i].unique_id === node.unique_id) {
                  siblingIndex = i;
                  break;
                }
              }
            }

            // 保存折叠信息
            setMerged((prev) => ({
              ...prev,
              [nodeId]: {
                children: childrenIds,
                subtreeNewick,
                parent: node.parent ? node.parent.unique_id : null,
                siblingIndex,
              },
            }));
          }
        }

        // 标记节点为已折叠
        setCollapsedNodes((prev) => {
          const newCollapsed = new Set(prev);
          newCollapsed.add(nodeId);
          return newCollapsed;
        });
      }
    },
    [treeInstance, merged, findNodeById, replaceNodeWithSubtree]
  );

  /**
   * 重命名節點
   * @param {string} nodeId - 節點ID
   * @param {string} newName - 新名稱
   */
  const handleNodeRename = useCallback(
    (nodeId, newName) => {
      console.log("🏷️ === handleNodeRename 開始 ===");
      console.log("  📝 nodeId:", nodeId);
      console.log("  📝 newName:", newName);
      console.log("  📝 當前 merged:", merged);
      console.log("  📝 當前 collapsedNodes:", Array.from(collapsedNodes));

      const isCollapsed = collapsedNodes.has(nodeId);
      console.log("  📝 isCollapsed:", isCollapsed);

      if (newName.trim() === "") {
        console.log("  📝 處理空字串重命名");
        setRenamedNodes((prevRenamedNodes) => {
          const newRenamedNodes = new Map(prevRenamedNodes);
          newRenamedNodes.delete(nodeId);
          return newRenamedNodes;
        });

        if (isCollapsed) {
          console.log("  📝 設置 shouldUpdateTree = true (空字串情況)");
          setShouldUpdateTree(true);
        }
      } else {
        console.log("  📝 處理非空字串重命名");
        if (isCollapsed && treeInstance) {
          console.log("  📝 進入折疊節點重命名邏輯");

          const node = findNodeById(treeInstance.nodes, nodeId);
          console.log("  📝 找到的節點:", node);

          if (node) {
            const siblings = node.parent ? node.parent.children : [];

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
            if (siblings.length > 0) {
              for (let i = 0; i < siblings.length; i++) {
                if (siblings[i].unique_id === node.unique_id) {
                  nodeIndex = i;
                  break;
                }
              }
            }

            // 为了保证状态更新的顺序，使用函数式更新
            console.log("  📝 準備更新 merged 狀態");
            setMerged((prevMerged) => {
              console.log("  📝 setMerged 回調執行");
              console.log("    📝 prevMerged:", prevMerged);
              const newMerged = { ...prevMerged };
              newMerged[nodeId] = {
                children: childrenIds,
                subtreeNewick: convertTreeToNewick(node, new Set(), new Map()),
                rename: newName,
                parent: node.parent ? node.parent.unique_id : null,
                siblingIndex: nodeIndex,
              };
              return newMerged;
            });

            console.log("  📝 準備更新 renamedNodes 狀態");
            setRenamedNodes((prevRenamedNodes) => {
              const newRenamedNodes = new Map(prevRenamedNodes);
              newRenamedNodes.set(nodeId, newName);
              return newRenamedNodes;
            });

            // 确保tree更新后更新newick
            // setTimeout(updateTree, 0);
            console.log("  📝 設置 shouldUpdateTree = true");
            setShouldUpdateTree(true);
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
      console.log("🏷️ === handleNodeRename 結束 ===");
    },
    [collapsedNodes, treeInstance, findNodeById, merged]
  );

  /**
   * 按閾值折疊節點
   * @param {number} threshold - 分支長度閾值
   */
  const handleThresholdCollapse = useCallback(
    (threshold) => {
      if (!treeInstance) {
        console.log("樹實例尚未準備好");
        return;
      }

      console.log("閾值:", threshold);

      // 獲取所有需要折疊的節點 ID
      const nodesToCollapse = new Set(collapsedNodes);

      // 自定義遍歷函數
      const traverseNodes = (node, hasParentCollapsed = false) => {
        if (!node) return;

        // 如果父節點已經被折疊，則跳過這個節點的檢查
        let shouldCollapseThisNode = false;

        // 只檢查尚未被父節點折疊的節點
        if (!hasParentCollapsed) {
          // 非葉節點且分支長度大於等於閾值
          if (node.children && node.children.length > 0) {
            if (node.data.abstract_x >= threshold) {
              console.log(
                "折疊節點:",
                node.unique_id,
                "分支長度:",
                node.data.abstract_x
              );
              nodesToCollapse.add(node.unique_id);
              shouldCollapseThisNode = true;

              // 添加折叠信息到 merged
              // 收集子节点IDs
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

              if (node.children) {
                node.children.forEach(collectChildrenIds);
              }

              // 获取子树的 Newick 表示
              const subtreeNewick = convertTreeToNewick(
                node,
                new Set(),
                new Map()
              );

              // 获取在父节点中的位置
              let siblingIndex = -1;
              if (node.parent) {
                for (let i = 0; i < node.parent.children.length; i++) {
                  if (node.parent.children[i].unique_id === node.unique_id) {
                    siblingIndex = i;
                    break;
                  }
                }
              }

              // 更新合并信息
              setMerged((prev) => ({
                ...prev,
                [node.unique_id]: {
                  children: childrenIds,
                  subtreeNewick,
                  parent: node.parent ? node.parent.unique_id : null,
                  siblingIndex,
                },
              }));
            }
          }
        }

        // 遍歷子節點，如果當前節點被折疊，則傳遞 true 給子節點
        if (node.children) {
          node.children.forEach((child) =>
            traverseNodes(child, hasParentCollapsed || shouldCollapseThisNode)
          );
        }
      };

      // 從根節點開始遍歷
      if (treeInstance.nodes) {
        traverseNodes(treeInstance.nodes);
      }

      // 更新折疊節點集合
      setCollapsedNodes(nodesToCollapse);
    },
    [treeInstance, collapsedNodes]
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
    replaceNodeWithSubtree, // 导出这个方法以便其他组件可以使用
    findNodeById, // 导出这个辅助方法
  };
}
