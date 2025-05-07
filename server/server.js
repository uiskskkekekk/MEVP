const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const apiRoutes = require("./routes/api");

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// 中間件 - 確保CORS設置正確
app.use(
  cors({
    origin: "*", // 允許所有來源，純粹用於測試
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()); // 確保添加這行來解析JSON請求體

// 路由
app.use("/api", apiRoutes);

// 基本健康檢查路由 - 用於測試伺服器是否正常運行
app.get("/", (req, res) => {
  res.send("Molecular Evolution Visualization Platform API is running");
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
