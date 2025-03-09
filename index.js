const express = require("express");
const fetch = require("node-fetch"); // 用于请求后端 API
const path = require("path");

const app = express();
const PORT = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // 解析 JSON 请求

// 你的后端 API 地址
const API_BASE_URL = "http://192.168.137.6:5000/api";
const API_KEY = "debug_key"; // 你的 API 密钥

// 🔹 获取设备列表，并返回给前端
app.get("/api/devices", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/devices`, {
            headers: { "X-API-Key": API_KEY },
        });
        const devicesData = await response.json();

        // 获取 UUID 列表
        const uuidResponse = await fetch(`${API_BASE_URL}/devices/uuid`, {
            headers: { "X-API-Key": API_KEY },
        });
        const uuidData = await uuidResponse.json();

        // 设备信息添加 UUID
        devicesData.devices.forEach((device, index) => {
            device.uuid = uuidData[index]; // 确保设备数据有 UUID
        });

        res.json(devicesData);
    } catch (error) {
        res.status(500).json({ error: "无法获取设备列表" });
    }
});


// 🔹 获取设备 UUID 列表（可用于调试）
app.get("/api/devices/uuid", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/devices/uuid`, {
            headers: { "X-API-Key": API_KEY },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "无法获取 UUID" });
    }
});

// 🔹 设备控制 API，转发给后端
app.post("/api/control", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/control`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
            },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "设备控制失败" });
    }
});

app.get("/api/control", async (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

// 监听端口
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});
