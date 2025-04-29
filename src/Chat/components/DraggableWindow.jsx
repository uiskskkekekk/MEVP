// src/Chat/components/DraggableWindow.jsx
import { useEffect, useRef, useState } from "react";
import "../styles/draggable-window.css";

function DraggableWindow({
  title,
  children,
  initialPosition = { x: 100, y: 100 },
  onClose,
  onHide,
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleResize = () => {
      if (windowRef.current) {
        const workspaceContainer = document.getElementById(
          "workspace-container"
        );
        if (workspaceContainer) {
          const containerRect = workspaceContainer.getBoundingClientRect();

          // 調整位置以確保窗口在工作區域內
          let adjustedX = position.x;
          let adjustedY = position.y;

          // 確保窗口在右邊界內
          if (adjustedX + 150 > containerRect.right) {
            adjustedX = containerRect.right - 150;
          }

          // 確保窗口在下邊界內
          if (adjustedY + 40 > containerRect.bottom) {
            adjustedY = containerRect.bottom - 40;
          }

          // 如果位置需要調整，更新位置
          if (adjustedX !== position.x || adjustedY !== position.y) {
            setPosition({
              x: adjustedX,
              y: adjustedY,
            });
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [position]);

  const handleMouseDown = (e) => {
    if (e.target.closest(".window-content")) return;

    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    // 獲取窗口尺寸
    const windowWidth = windowRef.current.offsetWidth;
    const windowHeight = windowRef.current.offsetHeight;

    // 獲取工作區域容器
    const workspaceContainer = document.getElementById("workspace-container");
    const containerRect = workspaceContainer.getBoundingClientRect();

    // 計算新位置
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    // 限制邊界到工作區域
    // 左邊界
    newX = Math.max(containerRect.left, newX);
    // 上邊界
    newY = Math.max(containerRect.top, newY);
    // 右邊界 (保留標題欄可見)
    newX = Math.min(newX, containerRect.right - 150);
    // 下邊界 (保留標題欄可見)
    newY = Math.min(newY, containerRect.bottom - 40);

    setPosition({
      x: newX,
      y: newY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={windowRef}
      className={`draggable-window ${isDragging ? "dragging" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="window-titlebar" onMouseDown={handleMouseDown}>
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <button className="hide-btn" onClick={onHide} title="hidden">
            −
          </button>
          <button
            className="close-btn"
            onClick={onClose}
            title="close-and-clear-chat"
          >
            ×
          </button>
        </div>
      </div>
      <div className="window-content">{children}</div>
    </div>
  );
}

export default DraggableWindow;
