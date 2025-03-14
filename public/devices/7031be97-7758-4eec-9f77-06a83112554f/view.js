const API_BASE = '/api';
let co2_status = null;
let tvoc_status = null;

const translations = {
  'zh-CN': {
    'title': '智能空气质量检测器',
    'name': '空气质量检测器',
    'readme': '这是一个空气质量检测仪。可以用来测量CO2和TVOC。',
    'current-status': '当前状态',
    'co2': '二氧化碳浓度:',
    'tvoc': '有害气体浓度:',
    'retry': '正在重试获取状态...',
    'config_error': '配置加载失败'
  },
  'en': {
    'title': 'Smart Air Quality Monitor',
    'name': 'Air Quality Monitor',
    'readme': 'An air quality monitor that can measure CO2 and TVOC.',
    'current-status': 'Current Status',
    'co2': 'Carbon Dioxide Concentration:',
    'tvoc': 'Total Volatile Organic Compounds:',
    'retry': 'Retrying status...',
    'config_error': 'Config load failed'
  }
};

// Toast相关函数
function createToast(message, type = 'info') {
  const container = document.querySelector('.toast-container') || createToastContainer();
  const toast = document.createElement('div');
  
  // 创建Toast元素
  toast.className = 'toast';
  toast.dataset.type = type;
  toast.innerHTML = `
    <svg class="toast-icon" viewBox="0 0 24 24">
      ${type === 'success' ? 
        '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' :
        '<path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18a8 8 0 0 1-8-8a8 8 0 0 1 8-8a8 8 0 0 1 8 8a8 8 0 0 1-8 8"/>'} 
    </svg>
    <span>${message}</span>
  `;

  // 添加自动消失逻辑
  const hideTimer = setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);

  // 点击立即关闭
  toast.addEventListener('click', () => {
    clearTimeout(hideTimer);
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  });

  container.appendChild(toast);
  return toast;
}

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// 一次性读取配置（立即执行）
(async function initConfig() {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) throw new Error('HTTP error');
    const config = await response.json();
    if (!config?.uuid) throw new Error('Missing UUID');
    sgp30UUID = config.uuid;
  } catch (error) {
    const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en';
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
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en';
}

// 更新界面显示
function updateUI(lang = getLanguage()) {
    document.getElementById('co2-status').textContent = co2_status;
    document.getElementById('tvoc-status').textContent = tvoc_status;
  }

// 获取设备ID
async function fetchDeviceId() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const sgp30Device = data.devices.find(d => d.uuid === sgp30UUID);
    co2_status = `${translations[getLanguage()].co2} ${sgp30Device.param.present.co2.content} ${sgp30Device.param.present.co2.measure}`;
    tvoc_status = `${translations[getLanguage()].tvoc} ${sgp30Device.param.present.tvoc.content} ${sgp30Device.param.present.tvoc.measure}`
    updateUI();
  } catch (error) {
    console.error('Error fetching device ID:', error);
  }
}

// 实时获取SGP30状态
async function updateSgp30Status() {
    try {
      const response = await fetch(`${API_BASE}/devices`);
      const data = await response.json();
      const sgp30Device = data.devices.find(d => d.uuid === sgp30UUID);
  
      // 实际更新状态变量
      co2_status = `${translations[getLanguage()].co2} ${sgp30Device.param.present.co2.content} ${sgp30Device.param.present.co2.measure}`;
      tvoc_status = `${translations[getLanguage()].tvoc} ${sgp30Device.param.present.tvoc.content} ${sgp30Device.param.present.tvoc.measure}`;
      
      updateUI();
    } catch (error) {
      console.error(translations[getLanguage()].retry, error);
      createToast(translations[getLanguage()].retry, 'error');
    }
  }

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  const lang = getLanguage();
  
  // 应用语言
  Object.entries(translations[lang]).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element && typeof value === 'string') element.textContent = value;
  });

  // 获取设备ID并初始化
  await fetchDeviceId();
  
  // 设置定时状态更新
  setInterval(updateSgp30Status, 1000);

});