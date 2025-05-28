// PhylotreeApp.jsx
import { useState } from "react";
import { DEFAULT_PADDING } from "./constants/treeConstants";
import { useExportFunctions } from "./hooks/useExportFunctions";
import { useTreeData } from "./hooks/useTreeData";

import ControlButtons from "./components/controls/ControlButtons";
import ExportControls from "./components/controls/ExportControls";
import SizeControls from "./components/controls/SizeControls";
import Phylotree from "./components/core/phylotree";
import ContextMenu from "./components/ui/ContextMenu";

import "./styles/phylotree.css";

/**
 * 系統發生樹應用主元件
 * @param {Object} props - 元件屬性
 * @param {string} props.initialNewick - 初始Newick字串
 * @param {number} props.padding - 圖表邊距
 * @returns {JSX.Element} 系統發生樹應用
 */
function PhylotreeApp({ initialNewick, padding = DEFAULT_PADDING }) {
  // 使用 useTreeData hook 管理树数据和相关操作
  const {
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
    replaceNodeWithSubtree, // 确保导出这个方法
    findNodeById // 确保导出这个辅助方法
  } = useTreeData(initialNewick);

  // 使用 useExportFunctions hook 处理导出功能
  const { exportModifiedNewick, exportTreeAsImage } = useExportFunctions(
    treeInstance, 
    collapsedNodes, 
    renamedNodes
  );
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
    nodeData: null,
    isNodeCollapsed: false
  });
  
  // 尺寸调整处理函数
  const handleExpandHorizontal = () => toggleDimension('width', 'expand');
  const handleCompressHorizontal = () => toggleDimension('width', 'compress');
  const handleExpandVertical = () => toggleDimension('height', 'expand');
  const handleCompressVertical = () => toggleDimension('height', 'compress');
  
  // 排序和对齐处理函数
  const handleSortAscending = () => handleSort('ascending');
  const handleSortDescending = () => handleSort('descending');
  const handleAlignTipsLeft = () => alignTipsDirection('left');
  const handleAlignTipsRight = () => alignTipsDirection('right');

  // 右键菜单处理函数
  const handleContextMenuEvent = (event) => {
    setContextMenu(event);
  };
  
  const closeContextMenu = () => {
    setContextMenu({
      ...contextMenu,
      visible: false,
    });
  };
  
  // 折叠/展开子树处理
  const handleCollapseSubtree = () => {
    const { nodeId, isNodeCollapsed } = contextMenu;
    toggleNodeCollapse(nodeId, isNodeCollapsed);
    closeContextMenu();
  };
  
  // 计算 SVG 尺寸
  const svgWidth = width + padding * 4;
  const svgHeight = height + padding * 4;
  
  // 搜索功能状态和处理函数
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  
  // 处理搜索输入变化
  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // 执行搜索
  const handleSearch = () => {
    if (!searchTerm.trim() || !treeInstance) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      setHighlightedNodeId(null);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const results = [];
    
    // 遍历树查找匹配节点
    treeInstance.traverse_and_compute((node) => {
      if (node.data.name && node.data.name.toLowerCase().includes(term)) {
        results.push({
          id: node.unique_id,
          name: node.data.name,
          x: node.data.abstract_x,
          y: node.data.abstract_y,
          isLeaf: treeInstance.isLeafNode(node)
        });
      }
      return true; // 继续遍历
    });
    
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
    setHighlightedNodeId(results.length > 0 ? results[0].id : null);
  };
  
  // 在搜索结果中导航
  const navigateSearchResults = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentResultIndex;
    
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % searchResults.length;
    } else if (direction === 'prev') {
      newIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentResultIndex(newIndex);
    setHighlightedNodeId(searchResults[newIndex].id);
  };
  
  // 检查节点是否为高亮状态
  const isNodeHighlighted = (nodeId) => {
    return nodeId === highlightedNodeId;
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <div className="phylotree-application">
          <div className="button-group-container">
            <ControlButtons
              onExpandHorizontal={handleExpandHorizontal}
              onCompressHorizontal={handleCompressHorizontal}
              onExpandVertical={handleExpandVertical}
              onCompressVertical={handleCompressVertical}
              onSortAscending={handleSortAscending}
              onSortDescending={handleSortDescending}
              onAlignTipsLeft={handleAlignTipsLeft}
              onAlignTipsRight={handleAlignTipsRight}
            />
            
            <input
              type="checkbox"
              onChange={toggleInternalLabels}
              checked={internalLabels}
              style={{ margin: "0px 3px 0px 10px" }}
            />
            {internalLabels ? "Hide" : "Show"} internal labels
            
            <div className="size-control-and-export">
              <SizeControls
                width={width}
                height={height}
                onWidthChange={setWidth}
                onHeightChange={setHeight}
              />
              <ExportControls
                onExportNewick={exportModifiedNewick}
                onExportImage={exportTreeAsImage}
              />
            </div>
          </div>
          
          {/* 增强的搜索容器 */}
          <div className="search-container">
            <input 
              name="sequenceName" 
              placeholder="Species Name"
              value={searchTerm}
              onChange={handleSearchInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
            
            {/* 导航按钮和结果显示，搜索有结果时显示 */}
            {searchResults.length > 0 && (
              <div className="search-navigation">
                <button 
                  onClick={() => navigateSearchResults('prev')}
                  disabled={searchResults.length <= 1}
                  title="Previous result"
                >
                  ↑
                </button>
                <button 
                  onClick={() => navigateSearchResults('next')}
                  disabled={searchResults.length <= 1}
                  title="Next result"
                >
                  ↓
                </button>
                <span>
                  {currentResultIndex + 1}/{searchResults.length}
                </span>
              </div>
            )}
            
            {/* 没有找到结果时显示 */}
            {searchTerm && searchResults.length === 0 && (
              <span>No results found</span>
            )}
          </div>
        </div>
      </div>

      <div className="tree_container" style={{ position: "relative" }}>
        <ContextMenu
          visible={contextMenu.visible}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onCollapseSubtree={handleCollapseSubtree}
          isNodeCollapsed={contextMenu.isNodeCollapsed}
        />

        <svg width={svgWidth + 150} height={svgHeight}>
          <Phylotree
            width={width}
            height={height}
            transform={`translate(${padding * 2}, ${padding * 2})`}
            newick={newick}
            onDimensionsChange={handleDimensionsChange}
            alignTips={alignTips}
            sort={sort}
            internalNodeLabels={internalLabels}
            onBranchClick={handleBranchClick}
            includeBLAxis
            collapsedNodes={collapsedNodes}
            renamedNodes={renamedNodes}
            merged={merged}
            onContextMenuEvent={handleContextMenuEvent}
            onTreeReady={handleTreeReady}
            onThresholdCollapse={handleThresholdCollapse}
            onNodeRename={handleNodeRename}
            isNodeHighlighted={isNodeHighlighted} // 传递高亮状态检查函数
          />
        </svg>
      </div>

      {clickedBranch ? <p>Last clicked branch was {clickedBranch}.</p> : null}
      
      {/* 当有高亮节点时显示详细信息 */}
      {highlightedNodeId && searchResults.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <p>
            <strong>Node:</strong> {searchResults[currentResultIndex].name}
          </p>
        </div>
      )}
    </div>
  );
}

export default PhylotreeApp;