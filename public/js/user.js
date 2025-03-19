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