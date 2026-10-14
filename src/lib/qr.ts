// Byte-mode QR, versions 1–5, ECC L (one Reed-Solomon block). Drawn in the
// browser so wedding links work on localhost and Amplify with no third party.

type Version = { version: number; data: number; ecc: number; align: number[] };

const VERSIONS: Version[] = [
  { version: 1, data: 19, ecc: 7, align: [] },
  { version: 2, data: 34, ecc: 10, align: [6, 18] },
  { version: 3, data: 55, ecc: 15, align: [6, 22] },
  { version: 4, data: 80, ecc: 20, align: [6, 26] },
  { version: 5, data: 108, ecc: 26, align: [6, 30] },
];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value >= 256) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}

function reedSolomon(data: Uint8Array, eccCount: number) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < eccCount; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= EXP[(LOG[poly[j]] + i) % 255];
    }
    poly = next;
  }
  const ecc = new Uint8Array(eccCount);
  for (const byte of data) {
    const factor = ecc[0] ^ byte;
    ecc.copyWithin(0, 1);
    ecc[eccCount - 1] = 0;
    if (factor === 0) continue;
    const logFactor = LOG[factor];
    for (let i = 0; i < eccCount; i += 1) {
      ecc[i] ^= EXP[(logFactor + LOG[poly[i + 1]]) % 255];
    }
  }
  return ecc;
}

function encodedLength(text: string) {
  return new TextEncoder().encode(text).length;
}

function dataCodewords(text: string, capacity: number) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length + 2 > capacity)
    throw new Error("URL is too long for this QR code.");
  const bits: number[] = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i -= 1) bits.push((bytes.length >> i) & 1);
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
  }
  const limit = capacity * 8;
  for (let i = 0; i < 4 && bits.length < limit; i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const pads = [0xec, 0x11];
  let pad = 0;
  while (bits.length < limit) {
    for (let i = 7; i >= 0; i -= 1) bits.push((pads[pad % 2] >> i) & 1);
    pad += 1;
  }
  const data = new Uint8Array(capacity);
  for (let i = 0; i < capacity; i += 1) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1)
      value = (value << 1) | bits[i * 8 + bit];
    data[i] = value;
  }
  return data;
}

function place(version: Version, text: string) {
  const size = 17 + version.version * 4;
  const matrix = Array.from({ length: size }, () =>
    Array<number>(size).fill(0),
  );
  const reserved = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  const set = (row: number, col: number, dark: boolean) => {
    matrix[row][col] = dark ? 1 : 0;
    reserved[row][col] = true;
  };
  const finder = (row: number, col: number) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const r = row + y;
        const c = col + x;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const edge = y === -1 || y === 7 || x === -1 || x === 7;
        const ring = y === 0 || y === 6 || x === 0 || x === 6;
        set(r, c, !edge && (ring || (y >= 2 && y <= 4 && x >= 2 && x <= 4)));
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
  for (const row of version.align) {
    for (const col of version.align) {
      if (reserved[row][col]) continue;
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
          set(row + y, col + x, Math.max(Math.abs(y), Math.abs(x)) !== 1);
        }
      }
    }
  }
  for (let i = 8; i < size - 8; i += 1) {
    if (!reserved[6][i]) set(6, i, i % 2 === 0);
    if (!reserved[i][6]) set(i, 6, i % 2 === 0);
  }
  set(size - 8, 8, true);
  for (let i = 0; i < 9; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  const data = dataCodewords(text, version.data);
  const stream = [...data, ...reedSolomon(data, version.ecc)];
  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const offset of [0, -1]) {
        const c = col + offset;
        if (reserved[row][c]) continue;
        const byte = stream[Math.floor(bitIndex / 8)] ?? 0;
        matrix[row][c] = (byte >> (7 - (bitIndex % 8))) & 1;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  return { matrix, reserved };
}

function maskBit(mask: number, row: number, col: number) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

// ECC L is 01. The least significant format bit is module 0.
function applyFormat(matrix: number[][], mask: number) {
  const value = (0b01 << 3) | mask;
  let rem = value << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  const bits = (((value << 10) | rem) ^ 0b101010000010010) & 0x7fff;
  const size = matrix.length;
  // First copy, LSB at module 0: up the left timing column, then left along row 8.
  const first: Array<[number, number]> = [
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [7, 8],
    [8, 8],
    [8, 7],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
  ];
  // Second copy, LSB at module 0: right along row 8, then down column 8.
  const second: Array<[number, number]> = [
    [8, size - 1],
    [8, size - 2],
    [8, size - 3],
    [8, size - 4],
    [8, size - 5],
    [8, size - 6],
    [8, size - 7],
    [8, size - 8],
    [size - 7, 8],
    [size - 6, 8],
    [size - 5, 8],
    [size - 4, 8],
    [size - 3, 8],
    [size - 2, 8],
    [size - 1, 8],
  ];
  for (let i = 0; i < 15; i += 1) {
    const dark = (bits >> i) & 1;
    matrix[first[i][0]][first[i][1]] = dark;
    matrix[second[i][0]][second[i][1]] = dark;
  }
}

function score(matrix: number[][]) {
  let total = 0;
  const line = (cells: number[]) => {
    let run = 1;
    for (let i = 1; i < cells.length; i += 1) {
      if (cells[i] === cells[i - 1]) run += 1;
      else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) total += 3 + (run - 5);
  };
  for (let i = 0; i < matrix.length; i += 1) {
    line(matrix[i]);
    line(matrix.map((row) => row[i]));
  }
  return total;
}

/** Quiet-zone QR matrix. 1 is dark. */
export function qrMatrix(text: string) {
  const bytes = encodedLength(text);
  const version = VERSIONS.find((item) => bytes + 2 <= item.data);
  if (!version) throw new Error("URL is too long for this QR code.");
  const size = 17 + version.version * 4;
  const { matrix, reserved } = place(version, text);
  let best = matrix;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = matrix.map((row) => row.slice());
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!reserved[row][col] && maskBit(mask, row, col)) {
          candidate[row][col] ^= 1;
        }
      }
    }
    applyFormat(candidate, mask);
    const total = score(candidate);
    if (total < bestScore) {
      best = candidate;
      bestScore = total;
    }
  }
  const quiet = 4;
  return Array.from({ length: size + quiet * 2 }, (_, row) =>
    Array.from({ length: size + quiet * 2 }, (_, col) => {
      const r = row - quiet;
      const c = col - quiet;
      return r >= 0 && c >= 0 && r < size && c < size ? best[r][c] : 0;
    }),
  );
}

export function qrSvg(text: string) {
  const matrix = qrMatrix(text);
  const size = matrix.length;
  const cells = matrix
    .flatMap((row, y) =>
      row.map((dark, x) =>
        dark ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "",
      ),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${cells}</svg>`;
}
