const API_BASE = '/api';
let deviceId = null;
let currentPower = null;
let currentFanLeftRight = null;
let currentFanUpDown = null;
let currentScreen = null;
let currentTemperature = null;
let currentMode = null;
let currentWind = null;
let setPower = null;
let setFanLeftRight = null;
let setFanUpDown = null;
let setScreen = null;
let setTemperature = null;
let setMode = null;
let setWind = null;
let refrigerationUUID = null; // 替换原来的常量


document.addEventListener("contextmenu", function (event) {
  event.preventDefault();
})

const translations = {
  'zh-CN': {
    'title': '空调控制',
    'name': '智能空调',
    'readme': '这是一个支持远程控制的智能空调',
    'current-status': '当前状态',
    'control': '控制操作',
    'power': { name: '电源', on: '开启', off: '关闭' },
    'screen': { name: '灯光', on: '开启', off: '关闭' },
    'fan_up_and_down': { name: '上下扫风', on: '开启', off: '关闭' },
    'fan_left_and_right': { name: '左右扫风', on: '开启', off: '关闭' },
    'temperature': { name: '温度', unit: '°C' },
    'mode': { name: '模式', auto: '自动', cool: '制冷', heat: '制热', wind: '送风', dry: '除湿' },
    'wind': { name: '风速', auto:'自动', low: '低', medium: '中', high: '高' },
    'power_button': '电源',
    'screen_button': '灯光',
    'fan_up_and_down_button': '上下扫风',
    'fan_left_and_right_button': '左右扫风',
    'temperature_up_button': '温度加',
    'temperature_down_button': '温度减',
    'mode_button': '模式',
    'wind_button': '风速',
    'error': '操作失败：',
    'success': '指令已发送',
    'retry': '正在重试获取状态...',
    'config_error': '配置加载失败'
  },
  'en': {
    'title': 'Air Conditioner Control',
    'name': 'Smart Air Conditioner',
    'readme': 'This is a smart air conditioner that supports remote control',
    'current-status': 'Current Status',
    'control': 'Control',
    'power': { name: 'Power', on: 'On', off: 'Off' },
    'screen': { name: 'Light', on: 'On', off: 'Off' },
    'fan_up_and_down': { name: 'Up and Down', on: 'On', off: 'Off' },
    'fan_left_and_right': { name: 'Left and Right', on: 'On', off: 'Off' },
    'temperature': { name: 'Temperature', unit: '°C' },
    'mode': { name: 'Mode', auto: 'Auto', cool: 'Cool', heat: 'Heat', wind: 'Wind', dry: 'Dry' },
    'wind': { name: 'Wind Speed', auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' },
    'power_button': 'Power',
    'screen_button': 'Light',
    'fan_up_and_down_button': 'Up and Down',
    'fan_left_and_right_button': 'Left and Right',
    'temperature_up_button': 'Temperature Up',
    'temperature_down_button': 'Temperature Down',
    'mode_button': 'Mode',
    'wind_button': 'Wind Speed',
    'error': 'Operation failed: ',
    'success': 'Command sent',
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
    refrigerationUUID = config.uuid;
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
  document.getElementById('power_status').textContent = `${translations[lang].power.name}: ${translations[lang].power[currentPower]}`;
  document.getElementById('screen_status').textContent = `${translations[lang].screen.name}: ${translations[lang].screen[currentScreen]}`;
  document.getElementById('fan_up_and_down_status').textContent = `${translations[lang].fan_up_and_down.name}: ${translations[lang].fan_up_and_down[currentFanUpDown]}`;
  document.getElementById('fan_left_and_right_status').textContent = `${translations[lang].fan_left_and_right.name}: ${translations[lang].fan_left_and_right[currentFanLeftRight]}`;
  document.getElementById('temperature_status').textContent = `${translations[lang].temperature.name}: ${currentTemperature} ${translations[lang].temperature.unit}`;
  document.getElementById('mode_status').textContent = `${translations[lang].mode.name}: ${translations[lang].mode[currentMode]}`;
  document.getElementById('wind_status').textContent = `${translations[lang].wind.name}: ${translations[lang].wind[currentWind]}`;
}

// 获取设备ID
async function fetchDeviceId() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const refrigerationDevice = data.devices.find(d => d.uuid === refrigerationUUID);
    deviceId = refrigerationDevice?.id;
    setPower = currentPower = refrigerationDevice.param.present.power;
    setScreen = currentScreen = refrigerationDevice?.param.present.screen;
    setFanUpDown = currentFanUpDown = refrigerationDevice?.param.present.fan_up_and_down;
    setFanLeftRight = currentFanLeftRight = refrigerationDevice?.param.present.fan_left_and_right;
    setTemperature = currentTemperature = refrigerationDevice?.param.present.temperature;
    setMode = currentMode = refrigerationDevice?.param.present.mode;
    setWind = currentWind = refrigerationDevice?.param.present.fan_speed;
    updateUI();
  } catch (error) {
    console.error('Error fetching device ID:', error);
  }
}

// 实时获取门状态
async function updateRefrigerationStatus() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const refrigerationDevice = data.devices.find(d => d.uuid === refrigerationUUID);
    currentPower = refrigerationDevice.param.present.power;
    currentScreen = refrigerationDevice?.param.present.screen;
    currentFanUpDown = refrigerationDevice?.param.present.fan_up_and_down;
    currentFanLeftRight = refrigerationDevice?.param.present.fan_left_and_right;
    currentTemperature = refrigerationDevice?.param.present.temperature;
    currentMode = refrigerationDevice?.param.present.mode;
    currentWind = refrigerationDevice?.param.present.fan_speed;
    updateUI();
  } catch (error) {
    console.error(translations[getLanguage()].retry, error);
  }
}

// 发送控制指令
async function sendCommand() {
  if (deviceId === null || deviceId === undefined) {
    createToast('Device not initialized', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [{
          id: deviceId,
          param: {
            "power": setPower,
            "fan_up_and_down": setFanUpDown,
            "screen": setScreen,
            "fan_left_and_right": setFanLeftRight,
            "temperature": setTemperature,
            "mode": setMode,
            "fan_speed": setWind
          }
        }]
      })
    });

    if (!response.ok) throw new Error(translations[getLanguage()].error + response.status);
    
    setTimeout(updateRefrigerationStatus, 1000);
  } catch (error) {
    reateToast(error.message, 'error');
  }
}

async function switchCommand(command) {
  switch (command) {
    case 'power':
      if (currentPower === 'on') {
        setPower = 'off';
      } else {
        setPower = 'on';
      }
      break;
    case 'screen':
      if (currentScreen === 'on') {
        setScreen = 'off';
      } else {
        setScreen = 'on';
      }
      break;
    case 'fan_up_and_down':
      if (currentFanUpDown === 'on') {
        setFanUpDown = 'off';
      } else {
        setFanUpDown = 'on';
      }
      break;
    case 'fan_left_and_right':
      if (currentFanLeftRight === 'on') {
        setFanLeftRight = 'off';
      } else {
        setFanLeftRight = 'on';
      }
      break;
    case 'mode':
      const mode = ['auto', 'cool', 'heat', 'wind'];
      const currentIndex = mode.indexOf(currentMode);
      setMode = mode[(currentIndex + 1) % mode.length];
      break;
    case 'wind':
      const wind = ['auto', 'low', 'medium', 'high'];
      const currentWindIndex = wind.indexOf(currentWind);
      setWind = wind[(currentWindIndex + 1) % wind.length];
      break;
    default:
      return;
  }
  sendCommand();
  updateRefrigerationStatus();
}

async function temperatureCommand(command) {
  if (command === 'up' && setTemperature < 30) {
    setTemperature = currentTemperature + 1;
  } else if (command === 'down' && setTemperature > 16) {
    setTemperature = currentTemperature - 1;
  } else {
    return;
  }
  sendCommand();
  updateRefrigerationStatus();
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
  setInterval(updateRefrigerationStatus, 2000);
  
  // 绑定按钮事件
  document.getElementById('power_button').addEventListener('click', () => switchCommand('power'));
  document.getElementById('screen_button').addEventListener('click', () => switchCommand('screen'));
  document.getElementById('fan_up_and_down_button').addEventListener('click', () => switchCommand('fan_up_and_down'));
  document.getElementById('fan_left_and_right_button').addEventListener('click', () => switchCommand('fan_left_and_right'));
  document.getElementById('temperature_up_button').addEventListener('click', ()=> temperatureCommand('up'));
  document.getElementById('temperature_down_button').addEventListener('click', ()=> temperatureCommand('down'));
  document.getElementById('mode_button').addEventListener('click', () => switchCommand('mode'));
  document.getElementById('wind_button').addEventListener('click', () => switchCommand('wind'));
});