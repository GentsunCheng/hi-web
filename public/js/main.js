document.addEventListener('DOMContentLoaded', async () => {
    const deviceList = document.getElementById('device-list');

    try {
        const response = await fetch('/api/devices');
        const data = await response.json();

        for (const device of data.devices) {
            const div = document.createElement('div');
            div.classList.add('device-card');
            div.id = `device-${device.uuid}`; // 修复模板字符串
            deviceList.appendChild(div);

            const script = document.createElement('script');
            script.src = `/devices/${device.uuid}/inner.js`; // 修复路径
            script.dataset.deviceId = device.uuid;
            script.defer = true;

            script.onload = () => console.log(`✅ 设备 ${device.uuid} 的 inner.js 加载完成`);
            script.onerror = () => console.error(`❌ 加载设备 ${device.uuid} 的 inner.js 失败`);
            
            document.body.appendChild(script);
        }
    } catch (err) {
        console.error('加载设备列表失败', err);
    }
});