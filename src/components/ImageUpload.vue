<template>
  <div class="image-upload">
    <h2>安全图片上传（COS）</h2>

    <div class="upload-area" @drop.prevent="handleDrop" @dragover.prevent @dragenter.prevent>
      <input ref="fileInputRef" type="file" accept="image/png,image/jpeg,image/jpg" @change="handleFileSelect"
        style="display: none" />

      <div v-if="!uploading && !previewUrl" class="upload-placeholder">
        <p>点击或拖拽图片到此处上传</p>
        <p class="hint">支持 PNG、JPG 格式</p>
        <button @click="triggerFileInput" class="upload-btn">选择文件</button>
      </div>

      <div v-if="uploading" class="upload-status">
        <p>正在验证并上传文件...</p>
        <div class="progress-bar">
          <div class="progress" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <div v-if="previewUrl && !uploading" class="preview-area">
        <img :src="previewUrl" alt="预览" class="preview-image" />
        <div class="preview-actions">
          <button @click="resetUpload" class="btn-secondary">重新上传</button>
          <button @click="copyUrl" class="btn-primary" v-if="uploadedUrl">复制链接</button>
        </div>
        <p v-if="uploadedUrl" class="upload-url">{{ uploadedUrl }}</p>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <strong>错误：</strong>{{ error }}
    </div>

    <div v-if="warning" class="warning-message">
      <strong>警告：</strong>{{ warning }}
    </div>

    <div class="security-info">
      <h3>安全特性</h3>
      <ul>
        <li>✓ 文件扩展名验证</li>
        <li>✓ 文件头（Magic Bytes）验证 - 防止恶意文件绕过</li>
        <li>✓ MIME类型检查</li>
        <li>✓ 文件大小限制（最大 5MB）</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { validateFileType } from '../utils/fileValidator'
import { uploadViaBackendAPI } from '../utils/cosUpload'

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const previewUrl = ref<string>('')
const uploadedUrl = ref<string>('')
const error = ref<string>('')
const warning = ref<string>('')
const progress = ref(0)

// 文件大小限制：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// 允许的文件类型
const ALLOWED_TYPES = ['png', 'jpg']

/**
 * 触发文件选择对话框
 * 通过编程方式点击隐藏的文件输入元素，打开系统文件选择对话框
 * 
 * @returns void
 */
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

/**
 * 处理文件选择事件
 * 当用户通过文件输入框选择文件时触发
 * 
 * @param event - 文件输入框的change事件对象
 * @returns void
 */
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

/**
 * 处理拖拽文件事件
 * 当用户将文件拖拽到上传区域时触发
 * 
 * @param event - 拖拽事件对象（DragEvent）
 * @returns void
 */
const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

/**
 * 处理文件上传流程（核心处理函数）
 * 执行完整的上传流程，包括：
 * 1. 文件大小验证
 * 2. 文件类型验证（通过文件头Magic Bytes验证，防止恶意文件）
 * 3. 生成预览
 * 4. 上传到COS（通过后端API）
 * 5. 显示上传结果
 * 
 * @param file - 要处理的文件对象
 * @returns Promise<void>
 * 
 * @throws {Error} 当文件处理过程中发生错误时，错误信息会显示在error状态中
 */
const processFile = async (file: File) => {
  // 重置状态
  error.value = ''
  warning.value = ''
  previewUrl.value = ''
  uploadedUrl.value = ''
  progress.value = 0

  // 1. 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    error.value = `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`
    return
  }

  if (file.size === 0) {
    error.value = '文件为空'
    return
  }

  uploading.value = true
  progress.value = 10

  try {
    // 2. 验证文件类型（关键步骤：通过文件头验证）
    progress.value = 30

    const validationResult = await validateFileType(file, ALLOWED_TYPES)

    if (!validationResult.valid) {
      error.value = validationResult.error || '文件类型验证失败'
      uploading.value = false
      return
    }

    // 3. 显示预览
    progress.value = 50
    previewUrl.value = URL.createObjectURL(file)

    // 4. 上传到COS（通过后端API，更安全）
    progress.value = 70

    // 注意：这里需要配置你的后端API地址
    // 实际使用时，应该从环境变量或配置中获取
    const apiEndpoint = import.meta.env.VITE_UPLOAD_API || '/api/upload'

    const uploadResult = await uploadViaBackendAPI(file, apiEndpoint)

    if (!uploadResult.success) {
      error.value = uploadResult.error || '上传失败'
      uploading.value = false
      return
    }

    // 5. 上传成功
    progress.value = 100
    uploadedUrl.value = uploadResult.url || ''

    // 显示成功信息
    setTimeout(() => {
      uploading.value = false
    }, 500)

  } catch (err) {
    error.value = err instanceof Error ? err.message : '处理文件时出错'
    uploading.value = false
    previewUrl.value = ''
  }
}

/**
 * 重置上传状态
 * 清除所有上传相关的状态，包括预览图片、上传URL、错误信息等
 * 同时释放预览图片的Object URL以释放内存
 * 
 * @returns void
 */
const resetUpload = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  uploadedUrl.value = ''
  error.value = ''
  warning.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

/**
 * 复制上传后的文件URL到剪贴板
 * 使用浏览器的Clipboard API将上传成功后的文件URL复制到系统剪贴板
 * 
 * @returns Promise<void>
 * 
 * @throws {Error} 当剪贴板API不可用或复制失败时，错误信息会显示在error状态中
 */
const copyUrl = async () => {
  if (uploadedUrl.value) {
    try {
      await navigator.clipboard.writeText(uploadedUrl.value)
      alert('链接已复制到剪贴板')
    } catch (err) {
      error.value = '复制失败，请手动复制'
    }
  }
}
</script>

<style scoped>
.image-upload {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.upload-placeholder {
  width: 100%;
}

.upload-placeholder p {
  margin: 10px 0;
  color: #666;
}

.hint {
  font-size: 12px;
  color: #999;
}

.upload-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.upload-btn:hover {
  background: #66b1ff;
}

.upload-status {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 20px;
}

.progress {
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}

.preview-area {
  width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.preview-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 10px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn-secondary {
  background: #f4f4f5;
  color: #606266;
}

.btn-secondary:hover {
  background: #e9e9eb;
}

.upload-url {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  margin-top: 10px;
}

.error-message {
  margin-top: 20px;
  padding: 12px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  color: #f56c6c;
}

.warning-message {
  margin-top: 20px;
  padding: 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 4px;
  color: #e6a23c;
}

.security-info {
  margin-top: 30px;
  padding: 20px;
  background: #f0f9ff;
  border-radius: 8px;
}

.security-info h3 {
  margin-top: 0;
  color: #333;
}

.security-info ul {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}

.security-info li {
  padding: 5px 0;
  color: #666;
}
</style>
