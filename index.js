const express = require("express");
const fetch = require("node-fetch"); // 用于请求后端 API
const multer = require("multer");
const axios = require("axios");
const wav = require('wav');
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
const upload = multer({ storage: multer.memoryStorage() });

const CF_ACCOUNT_ID = config.cf_account_id;
const CF_API_TOKEN = config.cf_api_token;

args.forEach((arg) => {
    if (arg.startsWith('--port=')) {
        PORT = arg.split('=')[1];
    } else if (arg.startsWith('-p=')) {
        PORT = arg.split('=')[1];
    } else if (arg.startsWith('--api_key=')) {
        API_KEY = arg.split('=')[1];
    } else if (arg.startsWith('-k=')) {
        API_KEY = arg.split('=')[1];
    }
  });

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

app.get("/api/special_devices", async (req, res) => {
    try {
        const response = await fetch(`${API_BASE_URL}/special_devices`, {
            headers: { "X-API-Key": API_KEY },
        });
        const devicesData = await response.json();
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

app.post("/api/whisper", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "没有接收到音频文件" });
        }

        console.log("收到音频文件:", req.file.originalname);
        console.log(req.file.buffer.toString('hex').slice(0, 50)); // 输出前50个字节的十六进制内容


        // 解码 WAV 文件
        const reader = new wav.Reader();
        reader.on('format', function (format) {
            console.log("WAV 文件格式:", format);
        });

        reader.on('data', function (chunk) {
            // WAV 文件的音频数据（通常是 PCM 格式）
            const audioData = chunk;
            const audioArray = new Uint8Array(audioData.length);

            // 将音频样本转换为 8-bit unsigned integer 数组
            audioData.forEach((sample, i) => {
                audioArray[i] = Math.min(255, Math.max(0, Math.floor((sample + 1) * 128)));
            });

            // 创建包含音频数据的对象
            const audioObject = { audio: Array.from(audioArray) };

            // 发送 API 请求
            axios.post(
                `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper`,
                audioObject,
                {
                    headers: {
                        Authorization: `Bearer ${CF_API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
            .then(response => res.json(response.data))
            .catch(error => {
                console.error("请求 Cloudflare 失败:", error.response?.data || error.message);
                res.status(500).json({ error: "请求 Cloudflare 失败" });
            });
        });

        // 将上传的文件内容传递给 WAV 解码器
        reader.write(req.file.buffer);
        reader.end();
        
    } catch (error) {
        console.error("请求处理失败:", error.message);
        res.status(500).json({ error: "请求处理失败" });
    }
});


// 监听端口
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});
