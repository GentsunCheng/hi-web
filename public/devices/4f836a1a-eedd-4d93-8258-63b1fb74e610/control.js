const API_BASE = '/api';
let deviceId = null;
let currentStatus = 'closed';
let doorUUID = null; // 替换原来的常量

const translations = {
  'zh-CN': {
    'title': '智能门锁控制',
    'name': '智能门锁',
    'readme': '这是一个支持远程控制的智能门锁',
    'current-status': '当前状态',
    'control': '控制操作',
    'status': { opened: '已开启', closed: '已关闭' },
    'button': '立即开门',
    'error': '操作失败：',
    'success': '开门指令已发送',
    'retry': '正在重试获取状态...',
    'config_error': '配置加载失败'
  },
  'en': {
    'title': 'Smart Door Control',
    'name': 'Smart Door',
    'readme': 'A remotely controllable smart door',
    'current-status': 'Current Status',
    'control': 'Control',
    'status': { opened: 'Open', closed: 'Closed' },
    'button': 'Open Now',
    'error': 'Operation failed: ',
    'success': 'Open command sent',
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
    doorUUID = config.uuid;
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
  document.getElementById('status').textContent = translations[lang].status[currentStatus];
  document.getElementById('send-control').textContent = translations[lang].button;
}

// 获取设备ID
async function fetchDeviceId() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const doorDevice = data.devices.find(d => d.uuid === doorUUID);
    deviceId = doorDevice?.id;
    currentStatus = doorDevice?.param.present.status || 'closed';
    updateUI();
  } catch (error) {
    console.error('Error fetching device ID:', error);
  }
}

// 实时获取门状态
async function updateDoorStatus() {
  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    const doorDevice = data.devices.find(d => d.uuid === doorUUID);
    currentStatus = doorDevice?.param.present.status || 'closed';
    updateUI();
  } catch (error) {
    console.error(translations[getLanguage()].retry, error);
  }
}

// 发送控制指令
async function controlDoor() {
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
          param: { status: "open" }
        }]
      })
    });

    if (!response.ok) throw new Error(translations[getLanguage()].error + response.status);
    
    createToast(translations[getLanguage()].success, 'success');
    setTimeout(updateDoorStatus, 1000);
  } catch (error) {
    reateToast(error.message, 'error');
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
  setInterval(updateDoorStatus, 2000);
  
  // 绑定按钮事件
  document.getElementById('send-control').addEventListener('click', controlDoor);
});