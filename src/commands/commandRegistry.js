// src/commands/commandRegistry.js
const commandRegistry = {
  // 系統發育樹相關命令
  phylotree: {
    // 調整視圖寬度
    adjustWidth: {
      execute: (params) => {
        const { width, instance } = params || {};

        if (!instance) {
          return { success: false, error: "系統發育樹實例未找到" };
        }

        if (!width || isNaN(width)) {
          return { success: false, error: "請提供有效的寬度值" };
        }

        // 確保寬度在有效範圍內
        const validWidth = Math.max(300, width);

        // 設置新的寬度
        instance.setState({ width: validWidth });

        return {
          success: true,
          message: `系統發育樹寬度已調整為 ${validWidth}px`,
        };
      },
    },

    // 調整視圖高度
    adjustHeight: {
      execute: (params) => {
        const { height, instance } = params || {};

        if (!instance) {
          return { success: false, error: "系統發育樹實例未找到" };
        }

        if (!height || isNaN(height)) {
          return { success: false, error: "請提供有效的高度值" };
        }

        // 確保高度在有效範圍內
        const validHeight = Math.max(300, height);

        // 設置新的高度
        instance.setState({ height: validHeight });

        return {
          success: true,
          message: `系統發育樹高度已調整為 ${validHeight}px`,
        };
      },
    },

    // 調整視圖尺寸（同時調整寬度和高度）
    adjustSize: {
      execute: (params) => {
        const { width, height, instance } = params || {};

        if (!instance) {
          return { success: false, error: "系統發育樹實例未找到" };
        }

        let result = { success: true, message: "" };

        // 調整寬度
        if (width && !isNaN(width)) {
          const validWidth = Math.max(300, width);
          instance.setState({ width: validWidth });
          result.message += `寬度已調整為 ${validWidth}px`;
        }

        // 調整高度
        if (height && !isNaN(height)) {
          const validHeight = Math.max(300, height);
          instance.setState({ height: validHeight });
          result.message += result.message
            ? `, 高度已調整為 ${validHeight}px`
            : `高度已調整為 ${validHeight}px`;
        }

        if (!result.message) {
          return { success: false, error: "請提供有效的寬度或高度值" };
        }

        return result;
      },
    },

    thresholdCollapse: {
      execute: (params) => {
        const { threshold, instance } = params || {};

        if (!instance) {
          return { success: false, error: "系統發育樹實例未找到" };
        }

        if (typeof threshold !== "number" || isNaN(threshold)) {
          return { success: false, error: "請提供有效的閾值" };
        }

        try {
          // 調用實例的 handleThresholdCollapse 方法
          instance.handleThresholdCollapse(threshold);

          return {
            success: true,
            message: `已根據閾值 ${threshold} 進行節點折疊`,
          };
        } catch (error) {
          return {
            success: false,
            error: `執行節點折疊時出錯: ${error.message}`,
          };
        }
      },
    },
  },
};

export default commandRegistry;
