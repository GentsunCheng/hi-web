export async function init(deviceId) {
    const deviceDiv = document.getElementById(`device-${deviceId}`);

    console.log(`📌 inner.js 模块执行，设备 ID: ${deviceId}`);

    if (!deviceDiv) {
        console.error(`❌ 设备 div #device-${deviceId} 不存在！`);
        return;
    }

    try {
        // 加载静态内容
        const [configResponse, innerResponse] = await Promise.all([
            fetch(`/devices/${deviceId}/config.json`),
            fetch(`/devices/${deviceId}/inner.html`)
        ]);

        if (!configResponse.ok || !innerResponse.ok) {
            throw new Error('资源加载失败');
        }

        const [configData, innerHTML] = await Promise.all([
            configResponse.json(),
            innerResponse.text()
        ]);

        // 初始化设备信息
        const userLanguage = navigator.language || 'en-US';
        const deviceInfo = configData[userLanguage] || configData['en-US'];
        deviceDiv.innerHTML = innerHTML;

        // 获取 DOM 元素
        const nameElement = deviceDiv.querySelector('.device-name');
        const readmeElement = deviceDiv.querySelector('.device-readme');
        const dataElement = deviceDiv.querySelector('.data');

        // 初始化静态内容
        if (nameElement) nameElement.textContent = deviceInfo.name;
        if (readmeElement) readmeElement.textContent = deviceInfo.readme;

        // 实时更新函数
        async function updateData() {
            try {
                const response = await fetch('/api/devices');
                const devicesData = await response.json();
                const currentDevice = devicesData.devices.find(d => d.uuid === deviceId);
                
                if (!currentDevice) {
                    console.error(`设备 ${deviceId} 不存在`);
                    return;
                }

                const co2 = `${currentDevice.param.present.co2.content}${currentDevice.param.present.co2.measure}`;
                const tvoc = `${currentDevice.param.present.tvoc.content}${currentDevice.param.present.tvoc.measure}`;
                
                if (dataElement) {
                    dataElement.textContent = `${deviceInfo.co2}: ${co2} ${deviceInfo.tvoc}: ${tvoc}`;
                    console.log(`✅ 数据更新 ${new Date().toLocaleTimeString()}`);
                }
            } catch (err) {
                console.error('数据更新失败:', err);
            }
        }

        // 立即执行一次并设置定时器
        await updateData();
        setInterval(updateData, 1500); // 每1.5秒更新一次

        // 添加点击交互
        deviceDiv.onclick = () => window.location.href = `/devices/${deviceId}/view.html`;
        deviceDiv.style.cursor = 'pointer';

    } catch (err) {
        console.error(`❌ 初始化设备 ${deviceId} 失败`, err);
        deviceDiv.innerHTML = `<div class="error">设备加载失败: ${err.message}</div>`;
    }
}