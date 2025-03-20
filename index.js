const express = require("express");
const fetch = require("node-fetch"); // 用于请求后端 API
const path = require("path");
const toml = require("toml");
const fs = require('fs');

const configFile = fs.readFileSync('config.toml', 'utf8');
const config = toml.parse(configFile);

const app = express();
const PORT = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // 解析 JSON 请求

// 你的后端 API 地址
const API_BASE_URL = config.api_url;
const API_KEY = config.api_key; // 你的 API 密钥

// 🔹 获取设备列表，并返回给前端
app.get("/api/devices", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/devices`, {
            headers: { "X-API-Key": API_KEY },
        });
        const devicesData = await response.json();

        // 获取 UUID 列表
        const sysparamResponse = await fetch(`${API_BASE_URL}/devices/sys_param`, {
            headers: { "X-API-Key": API_KEY },
        });
        const sysparamData = await sysparamResponse.json();

        // 设备信息添加 UUID，并删除没有 UUID 的设备
        devicesData.devices = devicesData.devices
            .map((device, index) => {
                if (sysparamData[index]["show"]) {
                    device.uuid = sysparamData[index]["uuid"];
                    return device;
                }
                return null; // 标记需要删除的项
            })
            .filter(device => device !== null); // 过滤掉 null 值，即删除无 UUID 的设备

        res.json(devicesData);
    } catch (error) {
        res.status(500).json({ error: "无法获取设备列表" });
    }
});


// 🔹 获取设备 UUID 列表（可用于调试）
app.get("/api/devices/sys_param", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/devices/sys_param`, {
            headers: { "X-API-Key": API_KEY },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "无法获取 UUID" });
    }
});

app.get("/api/userinfo", async (req, res) => {
    try{
        const response = await fetch(`${API_BASE_URL}/userinfo`, {
            headers: { "X-API-Key": API_KEY },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Unable to get user info" });
    }
});

app.post("/api/userinfo", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/userinfo`, {
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
        res.status(500).json({ error: "Unable to update user info" });
    }
})

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
