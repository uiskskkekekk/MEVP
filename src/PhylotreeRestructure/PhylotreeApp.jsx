import React, { useState } from "react";
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
    setWidth,
    setHeight
  } = useTreeData(initialNewick);

  const { exportModifiedNewick, exportTreeAsImage } = useExportFunctions(
    treeInstance, 
    collapsedNodes, 
    renamedNodes
  );
  
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
    nodeData: null,
    isNodeCollapsed: false
  });
  
  // 處理控制按鈕事件
  const handleExpandHorizontal = () => {
    toggleDimension('width', 'expand');
  };
  
  const handleCompressHorizontal = () => {
    toggleDimension('width', 'compress');
  };
  
  const handleExpandVertical = () => {
    toggleDimension('height', 'expand');
  };
  
  const handleCompressVertical = () => {
    toggleDimension('height', 'compress');
  };
  
  const handleSortAscending = () => {
    handleSort('ascending');
  };
  
  const handleSortDescending = () => {
    handleSort('descending');
  };
  
  const handleAlignTipsLeft = () => {
    alignTipsDirection('left');
  };
  
  const handleAlignTipsRight = () => {
    alignTipsDirection('right');
  };

  // 處理節點操作
  const handleContextMenuEvent = (event) => {
    setContextMenu(event);
  };
  
  const closeContextMenu = () => {
    setContextMenu({
      ...contextMenu,
      visible: false,
    });
  };
  
  const handleCollapseSubtree = () => {
    const { nodeId, isNodeCollapsed } = contextMenu;
    toggleNodeCollapse(nodeId, isNodeCollapsed);
    closeContextMenu();
  };
  
  // SVG 尺寸計算
  const svgWidth = width + padding * 4;
  const svgHeight = height + padding * 4;
  
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
          />
        </svg>
      </div>

      {clickedBranch ? <p>Last clicked branch was {clickedBranch}.</p> : null}
    </div>
  );
}

export default PhylotreeApp;