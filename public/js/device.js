// main.js
const moduleCache = new Map(); // 用于缓存模块
let config = {}; // 用于存储配置文件

function getLanguage() {
    return navigator.language.startsWith('zh') ? 'zh-CN' : 'en';
}

function updateUI(lang = getLanguage()) {
    document.getElementById("title").textContent = config[lang].title;
    document.getElementById("header").textContent = config[lang].header;
    document.getElementById("device").textContent = config[lang].device;
    document.getElementById("voice").textContent = config[lang].voice;
    document.getElementById("user").textContent = config[lang].user;
}

(async function initConfig() {
    try {
      const response = await fetch('assets/device.json');
      if (!response.ok) throw new Error('HTTP error');
      config = await response.json();
      updateUI();
    } catch (error) {
      console.error('加载配置文件失败', error);
      throw error; // 终止后续执行
    }
})();

// 加载设备模块（带缓存）
async function loadDeviceModule(deviceId) {
    if (moduleCache.has(deviceId)) {
        console.log(`📦 从缓存加载设备 ${deviceId} 的模块`);
        return moduleCache.get(deviceId);
    }

    try {
        console.log(`🚀 动态加载设备 ${deviceId} 的模块`);
        const module = await import(`/devices/${deviceId}/inner.js`);
        moduleCache.set(deviceId, module); // 缓存模块
        return module;
    } catch (err) {
        console.error(`❌ 加载设备 ${deviceId} 的模块失败`, err);
        throw err;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const deviceList = document.getElementById('device-list');

    try {
        const response = await fetch('/api/devices');
        const data = await response.json();

        // 创建设备卡片
        for (const device of data.devices) {
            const div = document.createElement('div');
            div.classList.add('device-card');
            div.id = `device-${device.uuid}`;
            div.dataset.deviceId = device.uuid; // 添加 deviceId 到 dataset
            deviceList.appendChild(div);
        }

        // 懒加载逻辑
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const deviceId = entry.target.dataset.deviceId;
                    console.log(`👀 设备 ${deviceId} 进入视野，开始加载模块`);

                    // 加载模块并初始化
                    loadDeviceModule(deviceId)
                        .then(module => module.init(deviceId))
                        .catch(err => console.error(`❌ 设备 ${deviceId} 初始化失败`, err));

                    observer.unobserve(entry.target); // 停止观察
                }
            });
        }, {
            rootMargin: '0px',
            threshold: 0.1, // 当设备卡片 10% 进入视野时触发
        });

        // 观察所有设备卡片
        deviceList.querySelectorAll('.device-card').forEach(div => {
            observer.observe(div);
        });
    } catch (err) {
        console.error('加载设备列表失败', err);
    }
    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    })
});