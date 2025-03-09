const API_BASE = '/api';
let deviceId = null;
(async () => {
    const scriptTag = document.currentScript;
    deviceId = scriptTag.dataset.deviceId; // 移除了 const 声明以使用外层变量
    const deviceDiv = document.getElementById(`device-${deviceId}`);

    // 提升作用域的变量
    let dataElement;
    let deviceInfo;

    console.log(`📌 inner.js 执行，设备 ID: ${deviceId}`);

    if (!deviceDiv) {
        console.error(`❌ 设备 div #device-${deviceId} 不存在！`);
        return;
    }

    try {
        // 初始化加载
        const configResponse = await fetch(`/devices/${deviceId}/config.json`);
        if (!configResponse.ok) throw new Error(`config.json 加载失败: ${configResponse.status}`);
        const configData = await configResponse.json();

        // 语言处理
        const userLanguage = navigator.language || 'en-US';
        deviceInfo = configData[userLanguage] || configData['en-US'];

        // 加载 HTML 模板
        const innerResponse = await fetch(`/devices/${deviceId}/inner.html`);
        if (!innerResponse.ok) throw new Error(`inner.html 加载失败: ${innerResponse.status}`);
        deviceDiv.innerHTML = await innerResponse.text();

        // 初始化元素引用
        dataElement = deviceDiv.querySelector('.data');
        const nameElement = deviceDiv.querySelector('.device-name');
        const readmeElement = deviceDiv.querySelector('.device-readme');

        // 初始化静态内容
        if (nameElement) nameElement.textContent = deviceInfo.name;
        if (readmeElement) readmeElement.textContent = deviceInfo.readme;

        // 状态更新函数
        const updateStatus = async () => {
            try {
                const response = await fetch(`${API_BASE}/devices`);
                const { devices } = await response.json();
                const targetDevice = devices.find(d => d.uuid === deviceId);
                
                if (!targetDevice) {
                    console.error('设备不在响应列表中');
                    return;
                }
                
                const status = targetDevice.param.present.status;
                if (dataElement) {
                    dataElement.textContent = 
                        `${deviceInfo.title}: ${deviceInfo.status[status] || '未知状态'}`;
                }
            } catch (err) {
                console.error('状态更新失败', err);
            }
        };

        // 初始立即更新 + 启动轮询
        await updateStatus();
        setInterval(updateStatus, 1000);

        // 点击跳转逻辑
        deviceDiv.style.cursor = 'pointer';
        deviceDiv.addEventListener('click', () => {
            window.location.href = `/devices/${deviceId}/control.html`;
        });

    } catch (err) {
        console.error(`❌ 加载设备 ${deviceId} 失败`, err);
        if (dataElement) {
            dataElement.textContent = "设备状态获取失败";
        }
    }
})();