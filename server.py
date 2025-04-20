import os
import wave
import tempfile
import argparse
import requests
import toml
import threading
from flask import Flask, request, jsonify, current_app, send_from_directory

# 加载配置文件 config.toml
with open("config.toml", "r", encoding="utf-8") as f:
    config = toml.load(f)

API_BASE_URL = config.get("api_url")
API_KEY = config.get("api_key")

# 解析命令行参数，用于覆盖端口和 API 密钥
parser = argparse.ArgumentParser()
parser.add_argument("-p", "--port", type=int, default=3000, help="服务器端口号")
parser.add_argument("-k", "--api_key", type=str, default=API_KEY, help="API 密钥")
args = parser.parse_args()
PORT = args.port
API_KEY = args.api_key

# 全局变量和锁，用于管理 Whisper 模型
model_lock = threading.Lock()
model_loaded = False
whisper_model = None

def load_whisper_model():
    """在子线程中加载 Whisper 模型"""
    global whisper_model, model_loaded
    try:
        import whisper  # 延迟导入以加速启动
        # 加载模型（根据需求调整模型大小）
        model = whisper.load_model("small")
        with model_lock:
            whisper_model = model
            model_loaded = True
        print("[INFO] Whisper 模型加载完成")
    except Exception as e:
        print("[ERROR] 加载 Whisper 模型失败:", e)
        with model_lock:
            model_loaded = False

# 启动模型加载线程
load_thread = threading.Thread(target=load_whisper_model)
load_thread.daemon = True  # 设为守护线程，主退出时自动终止
load_thread.start()

# 创建 Flask 应用
app = Flask(__name__, static_folder="public", static_url_path="")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# 🔹 获取设备列表接口
@app.route("/api/devices", methods=["GET"])
def get_devices():
    try:
        headers = {"X-API-Key": API_KEY}

        # 请求设备列表
        devices_resp = requests.get(f"{API_BASE_URL}/devices", headers=headers)
        devices_resp.raise_for_status()
        devices_data = devices_resp.json()

        # 请求系统参数（包含 uuid 和 show 字段）
        sysparam_resp = requests.get(f"{API_BASE_URL}/devices/sys_param", headers=headers)
        sysparam_resp.raise_for_status()
        sysparam_data = sysparam_resp.json()

        # 根据设备 id 过滤并添加 uuid
        filtered_devices = []
        for device in devices_data.get("devices", []):
            device_id = device.get("id")
            # sysparam_data 的键是字符串形式的 id
            sp = sysparam_data.get(str(device_id))
            if sp and sp.get("show"):
                device["uuid"] = sp.get("uuid")
                filtered_devices.append(device)

        devices_data["devices"] = filtered_devices
        return jsonify(devices_data)

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"获取设备列表请求错误：{e}")
        return jsonify({"error": "无法获取设备列表"}), 500

    except Exception as e:
        current_app.logger.exception("处理设备列表时出错")
        return jsonify({"error": "服务器内部错误"}), 500

# 🔹 获取特殊设备列表接口
@app.route("/api/special_devices", methods=["GET"])
def get_special_devices():
    try:
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{API_BASE_URL}/special_devices", headers=headers)
        return jsonify(response.json())
    except Exception as e:
        print("获取特殊设备列表错误：", e)
        return jsonify({"error": "无法获取设备列表"}), 500

# 🔹 获取设备 UUID 列表接口（用于调试）
@app.route("/api/devices/sys_param", methods=["GET"])
def get_devices_sys_param():
    try:
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{API_BASE_URL}/devices/sys_param", headers=headers)
        return jsonify(response.json())
    except Exception as e:
        print("获取 UUID 错误：", e)
        return jsonify({"error": "无法获取 UUID"}), 500

# 🔹 用户信息相关接口
@app.route("/api/userinfo", methods=["GET"])
def get_userinfo():
    try:
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{API_BASE_URL}/userinfo", headers=headers)
        return jsonify(response.json())
    except Exception as e:
        print("获取用户信息错误：", e)
        return jsonify({"error": "Unable to get user info"}), 500

@app.route("/api/userinfo", methods=["POST"])
def post_userinfo():
    try:
        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
        response = requests.post(f"{API_BASE_URL}/userinfo", headers=headers, json=request.json)
        return jsonify(response.json())
    except Exception as e:
        print("更新用户信息错误：", e)
        return jsonify({"error": "Unable to update user info"}), 500

# 🔹 设备控制接口
@app.route("/api/control", methods=["POST"])
def post_control():
    try:
        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
        response = requests.post(f"{API_BASE_URL}/control", headers=headers, json=request.json)
        return jsonify(response.json())
    except Exception as e:
        print("设备控制错误：", e)
        return jsonify({"error": "设备控制失败"}), 500

@app.route("/api/control", methods=["GET"])
def get_control():
    return jsonify({"status": "ok", "message": "Server is running"})

# 🔹 语音识别接口（添加模型状态检查）
@app.route("/api/whisper", methods=["POST"])
def api_whisper():
    # 检查模型是否就绪
    with model_lock:
        if not model_loaded:
            return jsonify({"error": "语音识别功能正在初始化，请稍后重试"}), 503
        local_model = whisper_model  # 获取本地模型引用

    try:
        if "file" not in request.files:
            return jsonify({"error": "没有接收到音频文件"}), 400
        
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "没有选择文件"}), 400

        # 处理文件内容
        file_bytes = file.read()
        print("[DEBUG] 收到音频文件:", file.filename)

        # 保存临时文件
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_filename = tmp.name

        # 验证文件格式
        try:
            with wave.open(tmp_filename, "rb") as wf:
                params = wf.getparams()
                print(f"[DEBUG] WAV 格式: {params}")
        except Exception as err:
            os.remove(tmp_filename)
            return jsonify({"error": f"无效的音频格式: {str(err)}"}), 400

        # 执行语音识别（确保线程安全）
        try:
            with model_lock:  # 加锁保证单线程推理
                result = local_model.transcribe(tmp_filename)
            print(f"[INFO] 识别结果: {result['text']}")
        except Exception as err:
            os.remove(tmp_filename)
            return jsonify({"error": f"识别失败: {str(err)}"}), 500

        os.remove(tmp_filename)
        return jsonify(result)
    except Exception as e:
        print("[ERROR] 语音识别异常:", e)
        return jsonify({"error": "内部服务器错误"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, threaded=True)