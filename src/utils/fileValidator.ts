/**
 * 文件类型验证工具
 * 通过文件头（Magic Bytes）验证文件的真实类型，防止恶意文件绕过扩展名检查
 */

/**
 * 文件类型定义接口
 * 用于描述支持的文件类型的配置信息
 */
export interface FileType {
  /** MIME类型，例如 'image/png' 或 'image/jpeg' */
  mime: string;
  /** 支持的文件扩展名数组，例如 ['png'] 或 ['jpg', 'jpeg'] */
  extensions: string[];
  /** Magic Bytes数组，支持多个可能的文件头变体，例如PNG只有一种，JPEG有多种 */
  magicBytes: number[][];
}

// 支持的文件类型配置
const SUPPORTED_FILE_TYPES: Record<string, FileType> = {
  png: {
    mime: 'image/png',
    extensions: ['png'],
    magicBytes: [
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] // PNG 标准文件头
    ]
  },
  jpg: {
    mime: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    magicBytes: [
      [0xff, 0xd8, 0xff, 0xe0], // JPEG (JFIF)
      [0xff, 0xd8, 0xff, 0xe1], // JPEG (EXIF)
      [0xff, 0xd8, 0xff, 0xe2], // JPEG (ICC)
      [0xff, 0xd8, 0xff, 0xe3], // JPEG (APP3)
      [0xff, 0xd8, 0xff, 0xdb]  // JPEG (原始)
    ]
  }
};

/**
 * 读取文件的前N个字节（文件头）
 * 用于后续的文件类型验证，通过读取文件的Magic Bytes来判断文件的真实类型
 * 
 * @param file - 要读取的文件对象
 * @param bytes - 要读取的字节数，默认为8字节（足够识别大多数文件类型）
 * @returns Promise<Uint8Array> - 返回文件头字节数组
 * @throws {Error} 当文件读取失败时抛出错误
 */
async function readFileHeader(file: File, bytes: number = 8): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(0, bytes);
    
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(e.target.result));
      } else {
        reject(new Error('无法读取文件头'));
      }
    };
    
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 检查文件头是否匹配指定的Magic Bytes
 * 通过逐字节比较文件头与预期的Magic Bytes来判断文件类型
 * 
 * @param fileHeader - 文件头的字节数组（通过readFileHeader获取）
 * @param magicBytes - 预期的Magic Bytes数组，例如PNG为[0x89, 0x50, 0x4e, 0x47, ...]
 * @returns boolean - 如果文件头匹配返回true，否则返回false
 */
function matchMagicBytes(fileHeader: Uint8Array, magicBytes: number[]): boolean {
  if (fileHeader.length < magicBytes.length) {
    return false;
  }
  
  for (let i = 0; i < magicBytes.length; i++) {
    if (fileHeader[i] !== magicBytes[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * 验证文件类型（核心安全验证函数）
 * 通过多层验证机制确保文件类型的真实性：
 * 1. 检查文件扩展名
 * 2. 检查MIME类型（警告但不阻止）
 * 3. 读取文件头并验证Magic Bytes（最关键的安全验证）
 * 
 * 此函数可以有效防止恶意文件通过修改扩展名来绕过验证，
 * 例如将.js文件改名为.png的情况会被检测并拒绝
 * 
 * @param file - 要验证的文件对象
 * @param allowedTypes - 允许的文件类型数组，例如 ['png', 'jpg']，默认为 ['png', 'jpg']
 * @returns Promise<{valid: boolean; detectedType?: string; error?: string}> - 验证结果对象
 *   - valid: 验证是否通过
 *   - detectedType: 检测到的文件类型（仅在valid为true时存在）
 *   - error: 错误信息（仅在valid为false时存在）
 * 
 * @example
 * ```typescript
 * const result = await validateFileType(file, ['png', 'jpg']);
 * if (result.valid) {
 *   console.log('文件类型:', result.detectedType);
 * } else {
 *   console.error('验证失败:', result.error);
 * }
 * ```
 */
export async function validateFileType(
  file: File,
  allowedTypes: string[] = ['png', 'jpg']
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  try {
    // 1. 检查文件扩展名
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const extensionMatch = allowedTypes.find(type => 
      SUPPORTED_FILE_TYPES[type]?.extensions.includes(fileExtension)
    );
    
    if (!extensionMatch) {
      return {
        valid: false,
        error: `不允许的文件扩展名: .${fileExtension}。仅支持: ${allowedTypes.map(t => SUPPORTED_FILE_TYPES[t]?.extensions.join(', ')).join(', ')}`
      };
    }
    
    // 2. 检查MIME类型（注意：MIME类型可以被伪造，不能完全信任）
    const fileTypeConfig = SUPPORTED_FILE_TYPES[extensionMatch];
    if (fileTypeConfig) {
      const expectedMime = fileTypeConfig.mime;
      if (file.type && file.type !== expectedMime) {
        // MIME类型不匹配，但继续检查文件头
        console.warn(`MIME类型不匹配: 期望 ${expectedMime}, 实际 ${file.type}`);
      }
    }
    
    // 3. 读取文件头并验证（这是最关键的验证）
    const maxMagicBytesLength = Math.max(
      ...allowedTypes.flatMap(type => 
        SUPPORTED_FILE_TYPES[type]?.magicBytes.map(mb => mb.length) || []
      )
    );
    
    const fileHeader = await readFileHeader(file, maxMagicBytesLength);
    
    // 检查文件头是否匹配允许的类型
    for (const type of allowedTypes) {
      const fileTypeConfig = SUPPORTED_FILE_TYPES[type];
      if (!fileTypeConfig) continue;
      
      for (const magicBytes of fileTypeConfig.magicBytes) {
        if (matchMagicBytes(fileHeader, magicBytes)) {
          // 文件头匹配，验证通过
          return {
            valid: true,
            detectedType: type
          };
        }
      }
    }
    
    // 文件头不匹配任何允许的类型
    return {
      valid: false,
      error: '文件头验证失败：文件内容与扩展名不匹配。可能是恶意文件或损坏的文件。'
    };
    
  } catch (error) {
    return {
      valid: false,
      error: `验证文件时出错: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 检测文件的真实类型（基于文件头Magic Bytes）
 * 不依赖文件扩展名，直接通过文件头判断文件类型
 * 适用于需要识别未知文件类型的场景
 * 
 * @param file - 要检测的文件对象
 * @returns Promise<string | null> - 返回检测到的文件类型（如'png'、'jpg'），
 *   如果无法识别则返回null
 * 
 * @example
 * ```typescript
 * const fileType = await detectFileType(file);
 * if (fileType) {
 *   console.log('检测到的文件类型:', fileType);
 * } else {
 *   console.log('无法识别的文件类型');
 * }
 * ```
 */
export async function detectFileType(file: File): Promise<string | null> {
  const fileHeader = await readFileHeader(file, 8);
  
  for (const [type, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    for (const magicBytes of config.magicBytes) {
      if (matchMagicBytes(fileHeader, magicBytes)) {
        return type;
      }
    }
  }
  
  return null;
}

