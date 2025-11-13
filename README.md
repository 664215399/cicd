# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## 安全图片上传功能

本项目实现了安全的图片上传功能，可以有效防止恶意文件（如将 `.js` 文件改名为 `.png`）绕过验证。

### 核心安全特性

- ✅ **文件头（Magic Bytes）验证** - 通过读取文件的前几个字节验证文件真实类型
- ✅ **文件扩展名验证** - 检查文件扩展名
- ✅ **MIME类型检查** - 检查文件的MIME类型
- ✅ **文件大小限制** - 防止上传过大的文件

### 使用方法

1. 运行项目：
```bash
npm install
npm run dev
```

2. 在浏览器中打开应用，使用图片上传组件

3. 尝试上传恶意文件（如将 `.js` 文件改名为 `.png`），系统会自动拒绝

### 重要提示

⚠️ **前端验证只是第一道防线，后端也必须进行相同的验证！**

详细的安全说明请查看 [SECURITY.md](./SECURITY.md)

### 相关文件

- `src/components/ImageUpload.vue` - 图片上传组件
- `src/utils/fileValidator.ts` - 文件验证工具（核心安全逻辑）
- `src/utils/cosUpload.ts` - COS上传工具
