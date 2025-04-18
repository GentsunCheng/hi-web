const API_BASE = "/api";

// 初始化设备
export async function init(deviceId) {
    const deviceDiv = document.getElementById(`device-${deviceId}`);

    if (!deviceDiv) {
        console.error(`❌ 设备 div #device-${deviceId} 不存在！`);
        return;
    }

    try {
        // 加载设备配置
        const configResponse = await fetch(`/devices/${deviceId}/config.json`);
        if (!configResponse.ok) throw new Error("config.json 加载失败");
        const configData = await configResponse.json();

        // 加载设备模板
        const innerResponse = await fetch(`/devices/${deviceId}/inner.html`);
        if (!innerResponse.ok) throw new Error("inner.html 加载失败");
        deviceDiv.innerHTML = await innerResponse.text();

        // 初始化语言配置
        const userLanguage = navigator.language || "en-US";
        const deviceInfo = configData[userLanguage] || configData["en-US"];
        console.log(`📌 使用语言 ${userLanguage}，解析后:`, deviceInfo);

        // 获取 DOM 元素
        const nameElement = deviceDiv.querySelector(".device-name");
        const readmeElement = deviceDiv.querySelector(".device-readme");
        const dataElement = deviceDiv.querySelector(".data");
        const colorIndicator = document.querySelector('.color-indicator');

        // 设置静态内容
        if (nameElement) nameElement.textContent = deviceInfo.name;
        if (readmeElement) readmeElement.textContent = deviceInfo.readme;

        // 状态更新函数
        const updateStatus = async () => {
            try {
                const response = await fetch(`${API_BASE}/devices`);
                const { devices } = await response.json();
                const targetDevice = devices.find((d) => d.uuid === deviceId);

                if (!targetDevice) {
                    console.warn("设备不在响应列表中");
                    return;
                }

                const status = targetDevice.param.present.status;
                const color_rgb = targetDevice.param.present.color_rgb;
                let border_rgb = [0, 0, 0];
                color_rgb.forEach(function(item, index) {
                    if (item > 128) {
                        border_rgb[index] = parseInt(item/3*2);
                    } else {
                        border_rgb[index] = parseInt(item/2*3);
                    }
                });
                if (dataElement) {
                    dataElement.textContent = `${deviceInfo.title}: ${
                        deviceInfo.status[status] || "未知状态"
                    }`;
                    colorIndicator.style.backgroundColor = `rgb(${color_rgb})`;
                    colorIndicator.style.borderColor = `rgb(${border_rgb})`;
                }
            } catch (err) {
                console.error("状态更新失败", err);
                if (dataElement) {
                    dataElement.textContent = "状态获取失败，请重试";
                }
            }
        };

        // 启动轮询
        updateStatus();
        const timer = setInterval(updateStatus, 1000);

        // 点击事件处理
        deviceDiv.style.cursor = "pointer";
        deviceDiv.addEventListener("click", () => {
            clearInterval(timer); // 清理定时器
            window.location.href = `/devices/${deviceId}/control.html`;
        });
    } catch (err) {
        console.error(`❌ 初始化设备 ${deviceId} 失败`, err);
    }
}
