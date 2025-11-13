/**
 * 腾讯云COS上传工具
 * 注意：实际使用时需要配置COS的密钥和存储桶信息
 */

/**
 * 腾讯云COS上传配置接口
 * 包含上传到COS所需的所有配置信息
 */
export interface COSUploadConfig {
  /** COS存储桶名称 */
  bucket: string;
  /** COS地域，例如 'ap-guangzhou'（广州）、'ap-shanghai'（上海） */
  region: string;
  /** 腾讯云SecretId（访问密钥ID） */
  secretId: string;
  /** 腾讯云SecretKey（访问密钥） */
  secretKey: string;
  /** 可选：自定义域名，如果设置了则使用此域名作为文件访问URL */
  domain?: string;
}

/**
 * 上传结果接口
 * 表示文件上传操作的结果
 */
export interface UploadResult {
  /** 上传是否成功 */
  success: boolean;
  /** 上传成功后的文件访问URL（仅在success为true时存在） */
  url?: string;
  /** 错误信息（仅在success为false时存在） */
  error?: string;
}

/**
 * 上传文件到腾讯云COS（对象存储）
 * 注意：这是一个示例函数，实际使用时需要配置COS SDK
 * 推荐使用uploadViaBackendAPI通过后端API上传，避免在前端暴露密钥
 * 
 * @param _file - 要上传的文件对象（应该已经通过validateFileType验证）
 * @param _config - COS配置对象
 *   - bucket: COS存储桶名称
 *   - region: COS地域，例如 'ap-guangzhou'
 *   - secretId: 腾讯云SecretId
 *   - secretKey: 腾讯云SecretKey
 *   - domain: 可选，自定义域名
 * @param _path - 文件在COS中的存储路径，例如 'images/2024/01/'，默认为 'images/'
 * @returns Promise<UploadResult> - 上传结果对象
 *   - success: 上传是否成功
 *   - url: 上传成功后的文件访问URL（仅在success为true时存在）
 *   - error: 错误信息（仅在success为false时存在）
 * 
 * @throws {Error} 当上传过程中发生错误时抛出异常
 * 
 * @example
 * ```typescript
 * const config = {
 *   bucket: 'my-bucket',
 *   region: 'ap-guangzhou',
 *   secretId: 'your-secret-id',
 *   secretKey: 'your-secret-key'
 * };
 * const result = await uploadToCOS(file, config, 'images/2024/');
 * if (result.success) {
 *   console.log('上传成功，URL:', result.url);
 * }
 * ```
 */
export async function uploadToCOS(
  _file: File,
  _config: COSUploadConfig,
  _path: string = 'images/'
): Promise<UploadResult> {
  try {
    // 注意：这里需要根据你的实际COS SDK进行实现
    // 以下是示例代码，实际使用时需要安装 @tencent-sdk/cos 或类似包
    
    // 生成唯一文件名的示例：
    // const timestamp = Date.now();
    // const randomStr = Math.random().toString(36).substring(2, 15);
    // const fileExtension = file.name.split('.').pop() || '';
    // const fileName = `${timestamp}_${randomStr}.${fileExtension}`;
    // const key = `${path}${fileName}`;
    
    // 示例：使用 Fetch API 上传（需要后端提供预签名URL）
    // 或者使用 COS SDK：
    // import COS from 'cos-js-sdk-v5';
    // const cos = new COS({
    //   SecretId: _config.secretId,
    //   SecretKey: _config.secretKey
    // });
    
    // 实际实现应该调用COS SDK或后端API
    // 这里返回一个示例结构
    return {
      success: false,
      error: '请配置COS SDK或使用后端API进行上传'
    };

    // 示例成功返回：
    // return {
    //   success: true,
    //   url: `https://${_config.bucket}.cos.${_config.region}.myqcloud.com/${key}`
    // };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

/**
 * 通过后端API上传文件到COS（推荐方式，更安全）
 * 将文件发送到后端API，由后端处理COS上传逻辑
 * 优点：
 * - 避免在前端暴露COS密钥
 * - 后端可以进行额外的安全验证
 * - 可以统一处理上传逻辑和错误处理
 * 
 * @param file - 要上传的文件对象（应该已经通过validateFileType验证）
 * @param apiEndpoint - 后端上传API的端点URL，例如 '/api/upload' 或 'https://api.example.com/upload'
 * @returns Promise<UploadResult> - 上传结果对象
 *   - success: 上传是否成功
 *   - url: 上传成功后的文件访问URL（仅在success为true时存在）
 *   - error: 错误信息（仅在success为false时存在）
 * 
 * @throws {Error} 当网络请求失败或响应解析失败时抛出异常
 * 
 * @example
 * ```typescript
 * const result = await uploadViaBackendAPI(file, '/api/upload');
 * if (result.success) {
 *   console.log('上传成功，URL:', result.url);
 * } else {
 *   console.error('上传失败:', result.error);
 * }
 * ```
 */
export async function uploadViaBackendAPI(
  file: File,
  apiEndpoint: string
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      body: formData,
      // 注意：不要在这里添加认证token，应该通过cookie或header传递
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '上传失败' }));
      return {
        success: false,
        error: errorData.error || `上传失败: ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url || data.data?.url
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

