# 图片上传安全防护说明

## 问题描述

恶意用户可能将 `.js` 文件的后缀名改为 `.png` 来绕过文件类型检查，上传恶意脚本文件。

## 解决方案

本项目实现了多层安全验证机制，确保只有真正的图片文件才能被上传：

### 1. 文件扩展名验证
- 检查文件扩展名是否为允许的类型（`.png`, `.jpg`, `.jpeg`）
- 这是第一道防线，但**不能单独依赖**，因为扩展名可以轻易伪造

### 2. MIME类型检查
- 检查文件的 MIME 类型（`image/png`, `image/jpeg`）
- 注意：MIME 类型也可能被伪造，所以**不能完全信任**

### 3. 文件头（Magic Bytes）验证 ⭐ **核心防护**
- 读取文件的前几个字节，检查文件头（Magic Bytes）
- PNG 文件头：`89 50 4E 47 0D 0A 1A 0A`
- JPEG 文件头：`FF D8 FF`（可能有多种变体）
- **这是最可靠的验证方式**，因为文件头是文件格式的固有特征，无法通过简单修改扩展名来伪造

### 4. 文件大小限制
- 限制文件大小（默认 5MB），防止上传过大的文件

## 实现细节

### 文件验证工具 (`src/utils/fileValidator.ts`)

```typescript
// 验证文件类型
const result = await validateFileType(file, ['png', 'jpg']);

if (!result.valid) {
  // 文件验证失败，拒绝上传
  console.error(result.error);
}
```

验证流程：
1. 检查文件扩展名
2. 检查 MIME 类型（警告但不阻止）
3. **读取文件头并验证 Magic Bytes**（关键步骤）
4. 如果文件头不匹配，拒绝上传

### 上传组件 (`src/components/ImageUpload.vue`)

组件会自动执行以下步骤：
1. 用户选择文件
2. 检查文件大小
3. 调用 `validateFileType` 进行安全验证
4. 验证通过后，显示预览
5. 上传到 COS（通过后端 API）

## 测试恶意文件

你可以测试以下场景来验证防护机制：

1. **将 `.js` 文件改名为 `.png`**
   - 结果：文件头验证失败，上传被拒绝
   - 错误信息：`文件头验证失败：文件内容与扩展名不匹配。可能是恶意文件或损坏的文件。`

2. **将 `.txt` 文件改名为 `.jpg`**
   - 结果：文件头验证失败，上传被拒绝

3. **上传真正的 PNG/JPG 图片**
   - 结果：验证通过，可以正常上传

## 后端验证（重要）

⚠️ **前端验证只是第一道防线，后端也必须进行相同的验证！**

### 为什么需要后端验证？

1. 前端代码可以被绕过（禁用 JavaScript、修改代码等）
2. 恶意用户可能直接调用后端 API
3. 双重验证确保安全性

### 后端验证建议

后端应该：
1. 检查文件扩展名
2. 检查 MIME 类型
3. **读取文件头验证 Magic Bytes**（最重要）
4. 检查文件大小
5. 可选：使用图片处理库（如 `sharp`、`PIL`）尝试解析图片，如果解析失败则拒绝

### Node.js 示例

```javascript
const fs = require('fs');

function validateImageFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // PNG 文件头
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  // JPEG 文件头
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
  
  const isPNG = buffer.slice(0, 8).equals(pngHeader);
  const isJPEG = buffer.slice(0, 3).equals(jpegHeader);
  
  if (!isPNG && !isJPEG) {
    throw new Error('文件头验证失败：不是有效的图片文件');
  }
  
  return isPNG ? 'png' : 'jpeg';
}
```

### Python 示例

```python
def validate_image_file(file_path):
    with open(file_path, 'rb') as f:
        header = f.read(8)
    
    # PNG 文件头
    png_header = b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A'
    # JPEG 文件头
    jpeg_header = b'\xFF\xD8\xFF'
    
    if header[:8] == png_header:
        return 'png'
    elif header[:3] == jpeg_header:
        return 'jpeg'
    else:
        raise ValueError('文件头验证失败：不是有效的图片文件')
```

## 最佳实践

1. ✅ **前后端双重验证**：前端验证提升用户体验，后端验证确保安全
2. ✅ **使用文件头验证**：不要仅依赖扩展名或 MIME 类型
3. ✅ **限制文件大小**：防止 DoS 攻击
4. ✅ **使用后端 API 上传**：避免在前端暴露 COS 密钥
5. ✅ **定期更新验证规则**：支持新的图片格式时更新 Magic Bytes
6. ✅ **记录上传日志**：记录所有上传尝试，包括失败的验证
7. ✅ **使用 CDN 和 WAF**：在 COS 前添加 Web 应用防火墙

## 相关文件

- `src/utils/fileValidator.ts` - 文件验证工具
- `src/utils/cosUpload.ts` - COS 上传工具
- `src/components/ImageUpload.vue` - 上传组件

