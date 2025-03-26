const API_BASE = "/api";
let deviceId = null;
let currentStatus = "off";
let lightUUID = null; // 替换原来的常量
let currentColor = null;

document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
});

const translations = {
    "zh-CN": {
        title: "RGB灯控制",
        name: "RGB灯",
        readme: "远程控制的RGB灯",
        "current-status": "当前状态",
        control: "控制操作",
        status: { on: "已开启", off: "已关闭" },
        button: { on: "立即开启", off: "立即关闭" },
        error: "操作失败：",
        success: { on: "已开启", off: "已关闭", color: "已设置颜色" },
        retry: "正在重试获取状态...",
        config_error: "配置加载失败",
    },
    en: {
        title: "RGB Light Control",
        name: "RGB Light",
        readme: "A remotely controllable RGB light",
        "current-status": "Current Status",
        control: "Control",
        status: { on: "Turned on", off: "Turned off" },
        button: { on: "Turn on", off: "Turn off" },
        error: "Operation failed:",
        success: { on: "Turned on", off: "Turned off", color: "Color set" },
        retry: "Retrying to get status...",
        config_error: "Configuration load failed",
    },
};

// Toast相关函数
function createToast(message, type = "info") {
    const container =
        document.querySelector(".toast-container") || createToastContainer();
    const toast = document.createElement("div");

    // 创建Toast元素
    toast.className = "toast";
    toast.dataset.type = type;
    toast.innerHTML = `
    <svg class="toast-icon" viewBox="0 0 24 24">
      ${
          type === "success"
              ? '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
              : '<path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18a8 8 0 0 1-8-8a8 8 0 0 1 8-8a8 8 0 0 1 8 8a8 8 0 0 1-8 8"/>'
      } 
    </svg>
    <span>${message}</span>
  `;

    // 添加自动消失逻辑
    const hideTimer = setTimeout(() => {
        toast.classList.add("hide");
        toast.addEventListener("animationend", () => toast.remove());
    }, 4000);

    // 点击立即关闭
    toast.addEventListener("click", () => {
        clearTimeout(hideTimer);
        toast.classList.add("hide");
        toast.addEventListener("animationend", () => toast.remove());
    });

    container.appendChild(toast);
    return toast;
}

function createToastContainer() {
    const container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
}

// 一次性读取配置（立即执行）
(async function initConfig() {
    try {
        const response = await fetch("./config.json");
        if (!response.ok) throw new Error("HTTP error");
        const config = await response.json();
        if (!config?.uuid) throw new Error("Missing UUID");
        lightUUID = config.uuid;
    } catch (error) {
        const lang = navigator.language.startsWith("zh") ? "zh-CN" : "en";
        document.body.innerHTML = `
      <h1 style="color: red; padding: 20px;">
        ${translations[lang].config_error}: ${error.message}
      </h1>
    `;
        throw error; // 终止后续执行
    }
})();

// 获取浏览器语言
function getLanguage() {
    return navigator.language.startsWith("zh") ? "zh-CN" : "en";
}

function hexToRgb(hex) {
    // 1. 移除 # 号
    hex = hex.replace(/^#/, "");

    // 2. 处理简写格式（如 #f00 → #ff0000）
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // 3. 转换为十进制数值
    const num = parseInt(hex, 16);

    // 4. 提取 RGB 分量
    return [
        (num >> 16) & 255, // 红色
        (num >> 8) & 255, // 绿色
        num & 255, // 蓝色
    ];
}

function rgbToHex(rgb) {
    return (
        "#" +
        rgb
            .map((value) => {
                const hex = value.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

// 更新界面显示
function updateUI(lang = getLanguage()) {
    document.getElementById("status").textContent =
        translations[lang].status[currentStatus];
    // 根据当前状态显示相反的操作按钮文本
    const buttonAction = currentStatus === "off" ? "on" : "off";
    document.getElementById("send-control").textContent =
        translations[lang].button[buttonAction];
}

function updateUIFirst(lang = getLanguage()) {
    document.getElementById("status").textContent =
        translations[lang].status[currentStatus];
    // 根据当前状态显示相反的操作按钮文本
    const buttonAction = currentStatus === "off" ? "on" : "off";
    document.getElementById("send-control").textContent =
        translations[lang].button[buttonAction];
    document.getElementById("colorPicker").value = rgbToHex(currentColor);
}

// 获取设备ID
async function fetchDeviceId() {
    try {
        const response = await fetch(`${API_BASE}/devices`);
        const data = await response.json();
        const lightDevice = data.devices.find((d) => d.uuid === lightUUID);
        deviceId = lightDevice?.id;
        currentStatus = lightDevice?.param.present.status;
        currentColor = lightDevice?.param.present.color_rgb;
        updateUIFirst();
    } catch (error) {
        console.error("Error fetching device ID:", error);
    }
}

async function updateLightStatus() {
    try {
        const response = await fetch(`${API_BASE}/devices`);
        const data = await response.json();
        const lightDevice = data.devices.find((d) => d.uuid === lightUUID);
        // 保持与设备状态严格同步
        currentStatus = lightDevice?.param.present.status;
        updateUI();
    } catch (error) {
        console.error(translations[getLanguage()].retry, error);
    }
}

// 发送控制指令
async function controlLight(event, action) {
    if (deviceId === null || deviceId === undefined) {
        createToast("Device not initialized", "error");
        return;
    }

    const lang = getLanguage();
    let targetAction, targetStatus;
    if (action === "status") {
        targetAction = currentStatus === "off" ? "on" : "off";
        targetStatus = targetAction === "on" ? "on" : "off";
    } else {
        targetAction = currentStatus === "off" ? "off" : "on";
        targetStatus = targetAction === "on" ? "on" : "off";
    }

    const colorPicker = document.getElementById("colorPicker");
    const color = colorPicker.value;

    try {
        const response = await fetch(`${API_BASE}/control`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                actions: [
                    {
                        id: deviceId,
                        param: {
                            status: targetAction,
                            color_rgb: hexToRgb(color),
                        }, // 使用动作指令
                    },
                ],
            }),
        });

        if (!response.ok)
            throw new Error(translations[lang].error + response.status);

        // 立即更新本地状态（后续轮询会同步真实状态）
        currentStatus = targetStatus;
        updateUI(lang);
        if (action === "status") {
            createToast(translations[lang].success[targetAction], "success");
        } else if (action === "color") {
            createToast(translations[lang].success.color, "success");
        }
    } catch (error) {
        createToast(error.message, "error");
    }
}

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
    const lang = getLanguage();

    // 应用语言
    Object.entries(translations[lang]).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element && typeof value === "string") element.textContent = value;
    });

    // 获取设备ID并初始化
    await fetchDeviceId();

    // 设置定时状态更新
    setInterval(updateLightStatus, 2000);

    // 绑定按钮事件
    document
        .getElementById("send-control")
        .addEventListener("click", (event) => {
            controlLight(event, "status");
        });
    document
        .getElementById("colorPicker")
        .addEventListener("change", (event) => {
            controlLight(event, "color");
        });
});
