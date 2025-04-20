const API_BASE = "/api";
let mediaRecorder;
let audioChunks = [];
let audioContext;
let mediaStreamSource;
let audioProcessor;

let deviceId = null;
let voiceUUID = "49160ffc-7f82-4703-802e-d985ea02d222";

async function startRecording() {
    console.log("开始录音");
    audioChunks = [];
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 尝试直接使用 WAV 格式的 MediaRecorder
        if (MediaRecorder.isTypeSupported('audio/wav')) {
            // 浏览器支持直接录制 WAV
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const wavBlob = new Blob(audioChunks, { type: 'audio/wav' });
                handleAudioBlob(wavBlob);
            };
            
            mediaRecorder.start();
        } else {
            // 浏览器不支持直接录制 WAV，改用 Web Audio API 手动编码
            audioContext = new AudioContext();
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            
            // 创建音频处理器（使用 ScriptProcessorNode）
            audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            
            let pcmData = [];
            
            audioProcessor.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer;
                const channelData = inputBuffer.getChannelData(0);
                pcmData.push(new Float32Array(channelData));
            };

            mediaStreamSource.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);
            
            // 保存停止录音的处理逻辑
            mediaRecorder = {
                stop: () => {
                    mediaStreamSource.disconnect();
                    audioProcessor.disconnect();
                    
                    // 将 PCM 数据转换为 WAV
                    const wavBlob = encodePCMToWAV(pcmData, audioContext.sampleRate);
                    handleAudioBlob(wavBlob);
                }
            };
        }
    } catch (error) {
        console.error("无法获取麦克风权限:", error);
    }
}

// PCM 数据转 WAV Blob
function encodePCMToWAV(pcmArrays, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    
    // 合并所有 PCM 数据
    const flatPCM = new Float32Array(pcmArrays.reduce((acc, arr) => {
        acc.push(...arr);
        return acc;
    }, []));

    // 转换为 16-bit 整数
    const buffer = new ArrayBuffer(44 + flatPCM.length * bytesPerSample);
    const view = new DataView(buffer);
    
    // WAV 头部（标准 44 字节头）
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + flatPCM.length * bytesPerSample, true); // 文件长度
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk 长度
    view.setUint16(20, 1, true); // PCM 格式
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // 字节率
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, flatPCM.length * bytesPerSample, true);

    // 写入 PCM 数据
    const pcmView = new Int16Array(buffer, 44);
    for (let i = 0; i < flatPCM.length; i++) {
        pcmView[i] = Math.max(-32768, Math.min(32767, flatPCM[i] * 32767));
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// 统一处理音频 Blob
function handleAudioBlob(wavBlob) {
    console.log("生成的 WAV 格式：", wavBlob.type);
    const audioUrl = URL.createObjectURL(wavBlob);
    document.getElementById("audio-player").src = audioUrl;
    uploadAudio(wavBlob);
}

async function uploadAudio(wavBlob) {
    const formData = new FormData();
    formData.append("file", wavBlob, "recording.wav");

    try {
        const response = await fetch(`${API_BASE}/whisper`, {
            method: "POST",
            body: formData,
        });
        const results = await response.json();
        await fetchDeviceId();
        sendcommand(results.text);
        console.log("转录结果:", results);
    } catch (error) {
        console.error("上传失败", error);
    }
}

// 停止录音（兼容两种模式）
function stopRecording() {
    if (mediaRecorder) {
        if (mediaRecorder instanceof MediaRecorder) { // 使用 MediaRecorder 模式
            if (mediaRecorder.state === "recording") {
                mediaRecorder.stop();
            }
        } else { // 使用 Web Audio API 模式
            // 手动断开音频源和处理器，确保音频处理停止
            mediaStreamSource.disconnect();
            audioProcessor.disconnect();
            
            // 手动触发停止，确保音频数据不再被捕获
            mediaRecorder.stop();
        }
    }
    
    // 清理可能存在的其他状态
    mediaRecorder = null; // 清理 mediaRecorder 对象
    audioContext?.close(); // 如果使用了 AudioContext，关闭它
    audioContext = null; // 清理 AudioContext
}



async function fetchDeviceId() {
    try {
      const response = await fetch(`${API_BASE}/special_devices`);
      const data = await response.json();
      const voiceDevice = data.devices.find(d => d.uuid === voiceUUID);
      deviceId = voiceDevice?.id;
    } catch (error) {
      console.error('Error fetching device ID:', error);
    }
  }

async function sendcommand(data) {
    try {
        const response = await fetch(`${API_BASE}/control`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                actions: [{
                    id: deviceId,
                    param: {
                        present: {
                            message: data
                        }
                    }
                }]
            }),
        });
        const result = await response.json();
        console.log("发送命令结果:", result);
    } catch (error) {
        console.error("发送命令失败:", error);
    }
}

// 绑定按钮（保持原有逻辑不变）
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("voice-btn");
    btn.addEventListener("mousedown", startRecording);
    btn.addEventListener("mouseup", stopRecording);
    btn.addEventListener("touchstart", startRecording);
    btn.addEventListener("touchend", stopRecording);
});