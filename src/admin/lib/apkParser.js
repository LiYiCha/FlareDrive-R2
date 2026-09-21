// 从上传的 APK / 模块包中自动提取版本元数据，免去手动填写版本号。
// - APK：按需读取 ZIP 内 AndroidManifest.xml（二进制 AXML），提取 package / versionCode / versionName
// - 模块 zip：读取 module.prop（Magisk/KernelSU 格式），提取 id / versionCode / versionName
// 只读取文件局部字节（EOCD + 中央目录 + 单个条目），不把整个文件载入内存。
import { inflateSync } from "fflate";

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

function readU16(buf, pos) {
  return buf[pos] | (buf[pos + 1] << 8);
}

function readU32(buf, pos) {
  return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
}

// 定位 End of Central Directory（从尾部反向扫描，并校验注释长度一致性以排除伪签名）
async function findEocd(file) {
  const tailLen = Math.min(file.size, 64 * 1024 + 22);
  const tail = new Uint8Array(await file.slice(file.size - tailLen).arrayBuffer());
  for (let i = tail.length - 22; i >= 0; i--) {
    if (readU32(tail, i) !== EOCD_SIG) continue;
    const commentLen = readU16(tail, i + 20);
    if (i + 22 + commentLen !== tail.length) continue;
    return {
      entryCount: readU16(tail, i + 10),
      cdSize: readU32(tail, i + 12),
      cdOffset: readU32(tail, i + 16),
    };
  }
  throw new Error("ZIP EOCD not found");
}

async function readCentralDirectory(file) {
  const eocd = await findEocd(file);
  const buf = new Uint8Array(await file.slice(eocd.cdOffset, eocd.cdOffset + eocd.cdSize).arrayBuffer());
  const entries = new Map();
  let pos = 0;
  for (let n = 0; n < eocd.entryCount && pos + 46 <= buf.length; n++) {
    if (readU32(buf, pos) !== CEN_SIG) break;
    const method = readU16(buf, pos + 10);
    const compSize = readU32(buf, pos + 20);
    const nameLen = readU16(buf, pos + 28);
    const extraLen = readU16(buf, pos + 30);
    const commentLen = readU16(buf, pos + 32);
    const lfhOffset = readU32(buf, pos + 42);
    const name = new TextDecoder().decode(buf.subarray(pos + 46, pos + 46 + nameLen));
    entries.set(name, { method, compSize, lfhOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// 通过本地文件头取数据真实起点（中央目录的偏移不含名字/扩展字段长度）
async function readEntryData(file, entry) {
  const head = new Uint8Array(await file.slice(entry.lfhOffset, entry.lfhOffset + 30).arrayBuffer());
  if (readU32(head, 0) !== LOC_SIG) throw new Error("ZIP local header not found");
  const nameLen = readU16(head, 26);
  const extraLen = readU16(head, 28);
  const dataStart = entry.lfhOffset + 30 + nameLen + extraLen;
  const raw = new Uint8Array(await file.slice(dataStart, dataStart + entry.compSize).arrayBuffer());
  if (entry.method === METHOD_STORED) return raw;
  if (entry.method === METHOD_DEFLATE) return inflateSync(raw);
  throw new Error("Unsupported ZIP method: " + entry.method);
}

// 二进制 AXML 的 String Pool 长度字段：UTF-8 池按字节变长编码，UTF-16 池按 16 位字编码
function readPoolLenUtf8(buf, pos) {
  const b = buf[pos];
  if (b & 0x80) return ((b & 0x7f) << 8) | buf[pos + 1];
  return b;
}

function readPoolLenUtf16(view, pos) {
  const w = view.getUint16(pos, true);
  if (w & 0x8000) return ((w & 0x7fff) << 16) | view.getUint16(pos + 2, true);
  return w;
}

function parseStringPool(buf, view, chunkStart, headerSize) {
  const stringCount = view.getUint32(chunkStart + 8, true);
  const flags = view.getUint32(chunkStart + 16, true);
  const stringsStart = view.getUint32(chunkStart + 20, true);
  const isUtf8 = (flags & 0x100) !== 0;
  const decoder = new TextDecoder(isUtf8 ? "utf-8" : "utf-16le");
  const strings = [];
  for (let i = 0; i < stringCount; i++) {
    const off = view.getUint32(chunkStart + headerSize + i * 4, true);
    let pos = chunkStart + stringsStart + off;
    if (isUtf8) {
      // 第一个变长值是字符数，跳过；第二个变长值才是字节数
      const charLenRaw = readPoolLenUtf8(buf, pos);
      pos += charLenRaw < 0x80 ? 1 : 2;
      const byteLen = readPoolLenUtf8(buf, pos);
      pos += byteLen < 0x80 ? 1 : 2;
      strings.push(decoder.decode(buf.subarray(pos, pos + byteLen)));
    } else {
      const charLen = readPoolLenUtf16(view, pos);
      pos += charLen >= 0x8000 ? 4 : 2;
      strings.push(decoder.decode(buf.subarray(pos, pos + charLen * 2)));
    }
  }
  return strings;
}

// 解析二进制 AndroidManifest.xml，返回 manifest 标签上的属性值
function parseAxml(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 8 || view.getUint16(0, true) !== 0x0003) {
    throw new Error("Not a binary AXML document");
  }
  let strings = [];
  const attrs = {};
  let manifestSeen = false;
  let pos = 8; // 跳过 RES_XML_TYPE 文件头（8 字节）
  while (pos + 8 <= buf.length) {
    const type = view.getUint16(pos, true);
    const headerSize = view.getUint16(pos + 2, true);
    const size = view.getUint32(pos + 4, true);
    if (size < 8 || pos + size > buf.length) break;

    if (type === 0x0001) {
      // RES_STRING_POOL_TYPE
      strings = parseStringPool(buf, view, pos, headerSize);
    } else if (type === 0x0102 && !manifestSeen) {
      // RES_XML_START_ELEMENT_TYPE
      const base = pos + headerSize;
      const nameIdx = view.getUint32(base + 4, true);
      const attrStart = view.getUint16(base + 8, true);
      const attrSize = view.getUint16(base + 10, true);
      const attrCount = view.getUint16(base + 12, true);
      if (strings[nameIdx] === "manifest" && attrSize >= 20) {
        manifestSeen = true;
        for (let i = 0; i < attrCount; i++) {
          const a = base + attrStart + i * attrSize;
          const aNameIdx = view.getUint32(a + 4, true);
          const rawValue = view.getInt32(a + 8, true);
          const dataType = view.getUint8(a + 15);
          const data = view.getUint32(a + 16, true);
          const key = strings[aNameIdx];
          if (key === "package" && dataType === 0x03) {
            attrs.package = strings[data];
          } else if (key === "versionCode" && (dataType === 0x10 || dataType === 0x11)) {
            attrs.versionCode = data;
          } else if (key === "versionName") {
            // 值可能是资源引用（0x01），此时回退到 rawValue 字符串
            attrs.versionName =
              dataType === 0x03 ? strings[data] : rawValue >= 0 ? strings[rawValue] : null;
          }
        }
      }
    }
    pos += size;
  }
  return attrs;
}

function parseModuleProp(text) {
  const props = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    props[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return {
    packageName: props.id || null,
    versionCode: parseInt(props.versionCode, 10),
    versionName: props.versionName || null,
    source: "module.prop",
  };
}

/**
 * 提取上传包的版本元数据。
 * @param {File|Blob} file
 * @returns {Promise<{packageName: string|null, versionCode: number, versionName: string|null, source: string}|null>}
 *          解析失败返回 null（调用方回退到手动填写流程），不抛错。
 */
export async function parsePackageMeta(file) {
  try {
    const entries = await readCentralDirectory(file);
    if (entries.has("AndroidManifest.xml")) {
      const xml = await readEntryData(file, entries.get("AndroidManifest.xml"));
      const attrs = parseAxml(xml);
      const versionCode = Number(attrs.versionCode);
      if (!Number.isFinite(versionCode) || versionCode <= 0) return null;
      return {
        packageName: attrs.package || null,
        versionCode,
        versionName: attrs.versionName || null,
        source: "AndroidManifest.xml",
      };
    }
    if (entries.has("module.prop")) {
      const data = await readEntryData(file, entries.get("module.prop"));
      const meta = parseModuleProp(new TextDecoder().decode(data));
      if (!Number.isFinite(meta.versionCode) || meta.versionCode <= 0) return null;
      return meta;
    }
    return null;
  } catch (e) {
    return null;
  }
}
