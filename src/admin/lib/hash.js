// MD5 实现（Web Crypto API 不支持 MD5）。
// Android 更新模块下载完成后会计算本地文件 MD5 并与 apkMd5 比对，
// 因此这里必须输出与标准 MD5 一致的结果（分块增量计算，不限制文件大小）。

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = new Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
}

function processBlock(state, block, offset) {
  const M = new Int32Array(16);
  for (let i = 0; i < 16; i++) {
    const p = offset + i * 4;
    M[i] = block[p] | (block[p + 1] << 8) | (block[p + 2] << 16) | (block[p + 3] << 24);
  }

  let [a, b, c, d] = state;
  for (let i = 0; i < 64; i++) {
    let f, g;
    if (i < 16) {
      f = (b & c) | (~b & d);
      g = i;
    } else if (i < 32) {
      f = (d & b) | (~d & c);
      g = (5 * i + 1) % 16;
    } else if (i < 48) {
      f = b ^ c ^ d;
      g = (3 * i + 5) % 16;
    } else {
      f = c ^ (b | ~d);
      g = (7 * i) % 16;
    }
    const tmp = d;
    d = c;
    c = b;
    // 加法在 double 精度内精确（各项均为 32 位值），>>> 0 完成 mod 2^32
    const sum = (a + f + K[i] + M[g]) >>> 0;
    const n = SHIFTS[i];
    const rotated = ((sum << n) | (sum >>> (32 - n))) >>> 0;
    b = (b + rotated) >>> 0;
    a = tmp;
  }
  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
}

function createMd5() {
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const pending = new Uint8Array(64);
  let pendingLen = 0;
  let totalLen = 0;

  function update(u8) {
    totalLen += u8.length;
    let offset = 0;
    if (pendingLen > 0) {
      const take = Math.min(64 - pendingLen, u8.length);
      pending.set(u8.subarray(0, take), pendingLen);
      pendingLen += take;
      offset = take;
      if (pendingLen === 64) {
        processBlock(state, pending, 0);
        pendingLen = 0;
      }
    }
    while (offset + 64 <= u8.length) {
      processBlock(state, u8, offset);
      offset += 64;
    }
    if (offset < u8.length) {
      pending.set(u8.subarray(offset), 0);
      pendingLen = u8.length - offset;
    }
  }

  function digestHex() {
    // 填充：0x80 + 若干 0 + 64 位小端比特长度
    const padLen = pendingLen < 56 ? 56 - pendingLen : 120 - pendingLen;
    const padding = new Uint8Array(padLen + 8);
    padding[0] = 0x80;
    const bitLen = totalLen * 8;
    const low = bitLen % 2 ** 32;
    const high = Math.floor(bitLen / 2 ** 32);
    for (let i = 0; i < 4; i++) {
      padding[padLen + i] = (low >>> (i * 8)) & 0xff;
      padding[padLen + 4 + i] = (high >>> (i * 8)) & 0xff;
    }
    // 把未处理数据与填充拼接，统一按 64 字节块处理（避免把 pending 的零字节当成数据）
    const buf = new Uint8Array(pendingLen + padding.length);
    buf.set(pending.subarray(0, pendingLen), 0);
    buf.set(padding, pendingLen);
    for (let offset = 0; offset + 64 <= buf.length; offset += 64) {
      processBlock(state, buf, offset);
    }

    let hex = "";
    for (const word of state) {
      for (let i = 0; i < 4; i++) {
        hex += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
      }
    }
    return hex;
  }

  return { update, digestHex };
}

// 计算文件（Blob/File）的完整 MD5，失败返回空串
export async function computeFileMd5(file) {
  try {
    const md5 = createMd5();
    const CHUNK = 4 * 1024 * 1024;
    for (let offset = 0; offset < file.size; offset += CHUNK) {
      const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
      md5.update(chunk);
    }
    return md5.digestHex();
  } catch (e) {
    return "";
  }
}
