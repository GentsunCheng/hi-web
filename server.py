import os
import sys
import wave
import tempfile
import argparse
import requests
import toml
import whisper
from flask import Flask, request, jsonify, send_from_directory

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

# 创建 Flask 应用，设置静态文件目录为 public
app = Flask(__name__, static_folder="public", static_url_path="")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# 🔹 获取设备列表接口
@app.route("/api/devices", methods=["GET"])
def get_devices():
    try:
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{API_BASE_URL}/devices", headers=headers)
        devices_data = response.json()

        # 获取 UUID 列表
        sysparam_response = requests.get(f"{API_BASE_URL}/devices/sys_param", headers=headers)
        sysparam_data = sysparam_response.json()

        # 设备信息添加 UUID，并删除没有 UUID 的设备
        devices = []
        for idx, device in enumerate(devices_data.get("devices", [])):
            if idx < len(sysparam_data) and sysparam_data[idx].get("show"):
                device["uuid"] = sysparam_data[idx].get("uuid")
                devices.append(device)
        devices_data["devices"] = devices

        return jsonify(devices_data)
    except Exception as e:
        print("获取设备列表错误：", e)
        return jsonify({"error": "无法获取设备列表"}), 500

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

# 🔹 加载本地 Whisper 模型（根据资源选择 tiny、base、small、medium、large，这里以 base 为例）
whisper_model = whisper.load_model("base")

# 🔹 语音识别接口，接收上传的 WAV 文件并使用本地模型进行识别
@app.route("/api/whisper", methods=["POST"])
def api_whisper():
    try:
        if "file" not in request.files:
            return jsonify({"error": "没有接收到音频文件"}), 400
        
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "没有选择文件"}), 400

        # 读取文件内容，并输出前 50 个字节的十六进制内容作为日志
        file_bytes = file.read()
        print("收到音频文件:", file.filename)
        print(file_bytes.hex()[:100])  # 50字节 * 2=100个字符

        # 将上传的文件保存为临时 WAV 文件
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_filename = tmp.name

        # 输出 WAV 文件格式信息
        try:
            with wave.open(tmp_filename, "rb") as wf:
                print("WAV 文件格式:", wf.getparams())
        except Exception as err:
            os.remove(tmp_filename)
            return jsonify({"error": f"解析WAV文件失败: {str(err)}"}), 400

        # 使用本地 Whisper 模型进行语音识别
        try:
            result = whisper_model.transcribe(tmp_filename)
            print("识别结果:", result)
        except Exception as err:
            os.remove(tmp_filename)
            return jsonify({"error": f"识别失败: {str(err)}"}), 500

        os.remove(tmp_filename)
        return jsonify(result)
    except Exception as e:
        print("语音识别处理失败：", e)
        return jsonify({"error": "请求处理失败"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
