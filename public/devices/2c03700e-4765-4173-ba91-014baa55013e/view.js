const API_BASE = '/api';
let skycon = null;
let temp = null;
let apparent_temp = null;
let humidity = null;
let wind_speed = null;


const translations = {
  'zh-CN': {
    'name': '天气信息',
    'readme_inner': '天气信息，了解当前实时天气。',
    'current-status': '当前状态',
    'skycon': '天气状况:',
    'temp': '温度:',
    'apparent_temp': '体感温度:',
    'humidity': '湿度:',
    'wind_speed': '风速:',
    'retry': '正在重试获取状态...',
    'config_error': '配置加载失败',
    "weather": {
            "CLEAR_DAY": "晴",
            "CLEAR_NIGHT": "晴",
            "PARTLY_CLOUDY_DAY": "多云",
            "PARTLY_CLOUDY_NIGHT": "多云",
            "CLOUDY": "阴",
            "LIGHT_HAZE": "轻度雾霾",
            "MODERATE_HAZE": "中度雾霾",
            "HEAVY_HAZE": "重度雾霾",
            "LIGHT_RAIN": "小雨",
            "MODERATE_RAIN": "中雨",
            "HEAVY_RAIN": "大雨",
            "STORM_RAIN": "暴雨",
            "FOG": "雾",
            "LIGHT_SNOW": "小雪",
            "MODERATE_SNOW": "中雪",
            "HEAVY_SNOW": "大雪",
            "STORM_SNOW": "暴雪",
            "DUST": "浮尘",
            "SAND": "沙尘",
            "WIND": "大风",
            "UNKNOWN": "未知"
        }
  },
  'en': {
      'name': 'Weather Info',
      'readme_inner': 'Get real-time weather information.',
      'current-status': 'Current Status',
      'skycon': 'Sky Condition:',
      'temp': 'Temperature:',
      'apparent_temp': 'Apparent Temperature:',
      'humidity': 'Humidity:',
      'wind_speed': 'Wind Speed:',
      'retry': 'Retrying status...',
      'config_error': 'Config load failed',
      "weather": {
            "CLEAR_DAY": "Clear",
            "CLEAR_NIGHT": "Clear",
            "PARTLY_CLOUDY_DAY": "Partly Cloudy",
            "PARTLY_CLOUDY_NIGHT": "Partly Cloudy",
            "CLOUDY": "Cloudy",
            "LIGHT_HAZE": "Light Haze",
            "MODERATE_HAZE": "Moderate Haze",
            "HEAVY_HAZE": "Heavy Haze",
            "LIGHT_RAIN": "Light Rain",
            "MODERATE_RAIN": "Moderate Rain",
            "HEAVY_RAIN": "Heavy Rain",
            "STORM_RAIN": "Storm Rain",
            "FOG": "Fog",
            "LIGHT_SNOW": "Light Snow",
            "MODERATE_SNOW": "Moderate Snow",
            "HEAVY_SNOW": "Heavy Snow",
            "STORM_SNOW": "Storm Snow",
            "DUST": "Dust",
            "SAND": "Sand",
            "WIND": "Wind",
            "UNKNOWN": "Unknown"
        }
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
    weatherUUID = config.uuid;
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
    document.getElementById('skycon').textContent = skycon;
    document.getElementById('temp').textContent = temp;
    document.getElementById('apparent_temp').textContent = apparent_temp;
    document.getElementById('humidity').textContent = humidity;
    document.getElementById('wind_speed').textContent = wind_speed;
  }

// 获取设备ID
async function fetchDeviceId() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const weatherDevice = data.devices.find(d => d.uuid === weatherUUID);
    const weather = translations[getLanguage()].weather[`${weatherDevice.param.present.skycon}`];
    skycon = `${translations[getLanguage()].skycon} ${weather}`;
    temp = `${translations[getLanguage()].temp} ${weatherDevice.param.present.temp.outdoor}`;
    apparent_temp = `${translations[getLanguage()].apparent_temp} ${weatherDevice.param.present.temp.apparent}`;
    humidity = `${translations[getLanguage()].humidity} ${weatherDevice.param.present.humidity}`;
    wind_speed = `${translations[getLanguage()].wind_speed} ${weatherDevice.param.present.wind_speed}`;
    updateUI();
  } catch (error) {
    console.error('Error fetching device ID:', error);
  }
}

async function updateWeatherStatus() {
    try {
      const response = await fetch(`${API_BASE}/devices`);
      const data = await response.json();
      const weatherDevice = data.devices.find(d => d.uuid === weatherUUID);
  
      // 实际更新状态变量
      const weather = translations[getLanguage()].weather[`${weatherDevice.param.present.skycon}`];
      skycon = `${translations[getLanguage()].skycon} ${weather}`;
      temp = `${translations[getLanguage()].temp} ${weatherDevice.param.present.temp.outdoor}`;
      apparent_temp = `${translations[getLanguage()].apparent_temp} ${weatherDevice.param.present.temp.apparent}`;
      humidity = `${translations[getLanguage()].humidity} ${weatherDevice.param.present.humidity}`;
      wind_speed = `${translations[getLanguage()].wind_speed} ${weatherDevice.param.present.wind_speed}`;
      
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
  setInterval(updateWeatherStatus, 1000);

});