const API_BASE = '/api';

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
        if (!configResponse.ok) throw new Error('config.json 加载失败');
        const configData = await configResponse.json();

        // 加载设备模板
        const innerResponse = await fetch(`/devices/${deviceId}/inner.html`);
        if (!innerResponse.ok) throw new Error('inner.html 加载失败');
        deviceDiv.innerHTML = await innerResponse.text();

        // 初始化语言配置
        const userLanguage = navigator.language || 'en-US';
        const deviceInfo = configData[userLanguage] || configData['en-US'];
        console.log(`📌 使用语言 ${userLanguage}，解析后:`, deviceInfo);

        // 获取 DOM 元素
        const nameElement = deviceDiv.querySelector('.device-name');
        const readmeElement = deviceDiv.querySelector('.device-readme');
        const dataElement = deviceDiv.querySelector('.data');

        // 设置静态内容
        if (nameElement) nameElement.textContent = deviceInfo.name;
        if (readmeElement) readmeElement.textContent = deviceInfo.readme;

        // 状态更新函数
        const updateStatus = async () => {
            try {
                const response = await fetch(`${API_BASE}/devices`);
                const { devices } = await response.json();
                const targetDevice = devices.find(d => d.uuid === deviceId);

                if (!targetDevice) {
                    console.warn('设备不在响应列表中');
                    return;
                }

                const skycon = targetDevice.param.present.skycon;
                const weather = deviceInfo.weather[skycon];
                const temp = targetDevice.param.present.temp.outdoor;
                const apparent_temp = targetDevice.param.present.temp.apparent;
                if (dataElement) {
                    dataElement.textContent = 
                        `${deviceInfo.status.skycon}: ${weather} ${deviceInfo.status.temp}: ${temp} ${deviceInfo.status.apparent_temp}: ${apparent_temp}`;
                }
            } catch (err) {
                console.error('状态更新失败', err);
                if (dataElement) {
                    dataElement.textContent = "状态获取失败，请重试";
                }
            }
        };

        // 启动轮询
        updateStatus();
        const timer = setInterval(updateStatus, 1000);

        // 点击事件处理
        deviceDiv.style.cursor = 'pointer';
        deviceDiv.addEventListener('click', () => {
            clearInterval(timer); // 清理定时器
            window.location.href = `/devices/${deviceId}/view.html`;
        });

    } catch (err) {
        console.error(`❌ 初始化设备 ${deviceId} 失败`, err);
    }
}