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
      const response = await fetch('assets/user.json');
      if (!response.ok) throw new Error('HTTP error');
      config = await response.json();
      updateUI();
    } catch (error) {
      console.error('加载配置文件失败', error);
      throw error; // 终止后续执行
    }
})();


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

document.addEventListener('DOMContentLoaded', async () => {
  const userContent = document.getElementById('user-content');
  try {
    const response = await fetch('/api/userinfo');
    const data = await response.json();
    for (const [key, value] of Object.entries(data)) {
      if (key in config.textareas) {
        userContent.innerHTML += `
          <p>
            ${config[getLanguage()][key]}: 
            <textarea class="md3-input" data-key="${key}">${value}</textarea>
          </p>`;
      } else {
        userContent.innerHTML += `
        <p>
          ${config[getLanguage()][key]}: 
          <input type="text" class="md3-input" value="${value}" data-key="${key}">
        </p>`;
      }
    }
    userContent.innerHTML += `<button id="save-btn" class="md3-button md3-button--raised md3-button--primary">${config[getLanguage()].save}</button>`;

    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('#user-content input');
      const updatedData = {};
      inputs.forEach(input => {
        updatedData[input.dataset.key] = input.value;
      });
      const response = await fetch('/api/userinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        createToast(config[getLanguage()].success, 'success');
      } else {
        createToast(config[getLanguage()].error, 'error');
      }
    })
  } catch (error) {
    console.error('获取用户信息失败', error);
    createToast(config[getLanguage()].get_error, 'error');
  }
});

