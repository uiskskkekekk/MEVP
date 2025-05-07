module.exports = {
  // 可以添加各種配置
  llm: {
    maxTokens: 1000,
    temperature: 0.7,
    responseFormat: "json",
  },
  server: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分鐘
      max: 100, // 限制每個IP 15分鐘內最多100個請求
    },
  },
};
