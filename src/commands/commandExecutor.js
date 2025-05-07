// src/commands/commandExecutor.js
import commandRegistry from "./commandRegistry";

// 命令執行器
const commandExecutor = {
  // 執行命令
  execute: (command) => {
    if (!command) {
      console.error("沒有提供命令");
      return { success: false, error: "沒有提供命令" };
    }

    const { action, target, parameters } = command;

    // 檢查命令是否有效
    if (!action || !target) {
      console.error("命令格式不正確");
      return { success: false, error: "命令格式不正確" };
    }

    // 檢查目標是否存在
    if (!commandRegistry[target]) {
      console.error(`未知目標: ${target}`);
      return { success: false, error: `未知目標: ${target}` };
    }

    // 檢查動作是否存在
    if (!commandRegistry[target][action]) {
      console.error(`目標 ${target} 不支持動作 ${action}`);
      return { success: false, error: `目標 ${target} 不支持動作 ${action}` };
    }

    // 執行命令
    try {
      const result = commandRegistry[target][action].execute(parameters);
      console.log("命令執行結果:", result);
      return result;
    } catch (error) {
      console.error(`執行命令時出錯: ${error.message}`);
      return { success: false, error: `執行命令時出錯: ${error.message}` };
    }
  },
};

export default commandExecutor;
