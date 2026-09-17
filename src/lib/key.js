// R2 bucket 对象 key 相关工具函数

/** 文件夹占位符——前后端统一常量 */
export const FOLDER_PLACEHOLDER = '_$folder$';

/**
 * 对 R2 bucket key 做 URL 安全编码
 * 把每个路径段单独 encodeURIComponent，再拼回 / 分隔
 * @param {string} key 原始 bucket key（可含中文、空格、% 等特殊字符）
 * @returns {string} 编码后的 URL 路径片段
 */
export function encodeKey(key) {
  if (!key) return '';
  return key.split('/').map(s => encodeURIComponent(s)).join('/');
}

/**
 * 从 bucket key 里提取显示用的文件名
 * 自动剥离 _$folder$ 占位符后缀
 */
export function displayName(key) {
  if (!key) return '';
  if (key.endsWith(FOLDER_PLACEHOLDER)) {
    key = key.slice(0, -FOLDER_PLACEHOLDER.length);
  }
  return key.split('/').filter(Boolean).pop() || '';
}

/** 判断 key 是否为文件夹占位符 */
export function isFolderKey(key) {
  return typeof key === 'string' && key.endsWith(FOLDER_PLACEHOLDER);
}
