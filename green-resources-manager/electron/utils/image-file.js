/**
 * @module ImageFile
 * @description 通过文件头（魔数）识别图片的真实格式。
 *
 * 扩展名可以被随意修改，也不能覆盖 jfif、jpe 等 JPEG 别名，
 * 所以判断是否为图片时以文件内容为准。
 */

const fs = require('fs')

/** 读取文件头部的字节数，足够覆盖常见图片签名，以及 SVG 前面的 XML 声明和注释。 */
const HEAD_SIZE = 8192

/** PNG 文件签名。 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * 读取文件开头的若干字节。
 * @param {string} filePath - 文件路径。
 * @returns {Buffer} 实际读到的内容。
 */
function readHead(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const buffer = Buffer.alloc(HEAD_SIZE)
    const bytesRead = fs.readSync(fd, buffer, 0, HEAD_SIZE, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    fs.closeSync(fd)
  }
}

/**
 * 判断文件头是否为 SVG。SVG 是文本格式，允许 BOM、XML 声明和注释。
 * @param {Buffer} head - 文件头内容。
 * @returns {boolean}
 */
function isSvgHead(head) {
  const text = head.toString('utf8').replace(/^\uFEFF/, '').trimStart()
  return text.startsWith('<') && /<svg[\s>]/i.test(text)
}

/**
 * 根据文件头识别图片格式。
 * @param {string} filePath - 文件路径。
 * @returns {string|null} png/jpeg/gif/bmp/webp/ico/svg，无法识别时返回 null。
 */
function detectImageFormat(filePath) {
  let head
  try {
    head = readHead(filePath)
  } catch (error) {
    return null
  }

  if (head.length >= 8 && head.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'png'
  }

  // JPEG 及其别名 jpg/jpeg/jpe/jfif 都以 FF D8 FF 开头
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'jpeg'
  }

  if (head.length >= 6) {
    const gifSignature = head.subarray(0, 6).toString('ascii')
    if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
      return 'gif'
    }
  }

  if (head.length >= 2 && head[0] === 0x42 && head[1] === 0x4d) {
    return 'bmp'
  }

  if (
    head.length >= 12 &&
    head.subarray(0, 4).toString('ascii') === 'RIFF' &&
    head.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }

  if (head.length >= 4 && head[0] === 0x00 && head[1] === 0x00 && head[2] === 0x01 && head[3] === 0x00) {
    return 'ico'
  }

  if (isSvgHead(head)) {
    return 'svg'
  }

  return null
}

/**
 * 判断文件内容是否为支持的图片。
 * @param {string} filePath - 文件路径。
 * @returns {boolean}
 */
function isImageFile(filePath) {
  return detectImageFormat(filePath) !== null
}

module.exports = {
  detectImageFormat,
  isImageFile
}
