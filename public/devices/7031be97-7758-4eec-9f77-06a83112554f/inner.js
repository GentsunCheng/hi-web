(async () => {
    const scriptTag = document.currentScript;
    const deviceId = scriptTag.dataset.deviceId;
    const deviceDiv = document.getElementById(`device-${deviceId}`);

    console.log(`📌 inner.js 执行，设备 ID: ${deviceId}`);

    if (!deviceDiv) {
        console.error(`❌ 设备 div #device-${deviceId} 不存在！`);
        return;
    }

    try {
        const response = await fetch('/api/devices');
        const device = await response.json();
        const data = device.devices.find(device => device.uuid === deviceId);
        const co2 = String(data.param.present.co2.content) + String(data.param.present.co2.measure);
        const tvoc = String(data.param.present.tvoc.content) + String(data.param.present.tvoc.measure);
        console.log(`📌 CO2: ${co2}, TVOC: ${tvoc}`);
        const configResponse = await fetch(`/devices/${deviceId}/config.json`);
        if (!configResponse.ok) throw new Error(`config.json 加载失败: ${configResponse.status}`);
        const configData = await configResponse.json();

        const userLanguage = navigator.language || 'en-US';
        const deviceInfo = configData[userLanguage] || configData['en-US'];
        console.log(`📌 使用语言 ${userLanguage}，解析后:`, deviceInfo);

        const innerResponse = await fetch(`/devices/${deviceId}/inner.html`);
        if (!innerResponse.ok) throw new Error(`inner.html 加载失败: ${innerResponse.status}`);
        const innerHTML = await innerResponse.text();

        deviceDiv.innerHTML = innerHTML;

        const nameElement = deviceDiv.querySelector('.device-name');
        const readmeElement = deviceDiv.querySelector('.device-readme');

        const dataElement = deviceDiv.querySelector('.data');

        if (nameElement) nameElement.textContent = deviceInfo.name;
        else console.warn('⚠️ 未找到 .device-name 元素');

        if (readmeElement) readmeElement.textContent = deviceInfo.readme;
        else console.warn('⚠️ 未找到 .device-readme 元素');

        if (dataElement) {
            dataElement.textContent = `${deviceInfo.co2}: ${co2} ${deviceInfo.tvoc}: ${tvoc}`;
        } else {
            console.warn('⚠️ 未找到 .data 元素');
        }

        deviceDiv.onclick = () => window.location.href = `/devices/${deviceId}/control.html`;
        deviceDiv.style.cursor = 'pointer';
    } catch (err) {
        console.error(`❌ 加载设备 ${deviceId} 数据失败`, err);
    }
})();