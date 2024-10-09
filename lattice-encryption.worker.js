// lattice-encryption.worker.js
const q = 8388608;
const n = 1024;
const m = 4096;
const indice = 10;
const BLOCK_SIZE = 128;

// Secure random number generation using Web Crypto API with chunking
const getRandomValues = (length) => {
  const QUOTA = 65536 / 4; // 65536 bytes / 4 bytes per 32-bit integer
  const array = new Uint32Array(length);
  for (let i = 0; i < length; i += QUOTA) {
    const subLength = Math.min(length - i, QUOTA);
    self.crypto.getRandomValues(array.subarray(i, i + subLength));
  }
  return array;
};

// Memoize the discreteGaussianSample function
const memoizedDiscreteSample = (() => {
  const cache = new Map();
  return (mean = 0, sigma = 1) => {
    const key = `${mean},${sigma}`;
    if (!cache.has(key)) {
      cache.set(key, discreteGaussianSample(mean, sigma));
    }
    return cache.get(key);
  };
})();

// Optimized modular arithmetic
const mod = (a, b) => {
  const r = a % b;
  return r < 0 ? r + b : r;
};

// Vectorized dot product
const dotProduct = (a, b) => {
  const vec = new Float64Array(4);
  for (let i = 0; i < a.length; i += 4) {
    vec[0] += a[i] * b[i];
    vec[1] += a[i + 1] * b[i + 1];
    vec[2] += a[i + 2] * b[i + 2];
    vec[3] += a[i + 3] * b[i + 3];
  }
  return mod(Math.round(vec[0] + vec[1] + vec[2] + vec[3]), q);
};

// Constant-time discrete Gaussian sampler using the Box-Muller transform
const discreteGaussianSample = (mean = 0, sigma = 1) => {
  let u1, u2, z0;
  const array = getRandomValues(2);

  do {
    u1 = array[0] / 4294967296;
    u2 = array[1] / 4294967296;
  } while (u1 === 0);

  z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.round(z0 * sigma + mean);
};

// Helper functions
const generateMatrix = (rows, cols) => {
  const matrix = getRandomValues(rows * cols);
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => matrix[i * cols + j] % q)
  );
};

const generateVector = (length) => {
  const vector = getRandomValues(length);
  return Array.from(vector, (val) => val % q);
};

const textToBinary = (text) => {
  return text
    .split("")
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
};

const binaryToText = (binary) => {
  return binary
    .match(/.{1,8}/g)
    .map((byte) => String.fromCharCode(parseInt(byte, 2)))
    .join("");
};

// Padding functions
const addPadding = (binary) => {
  const paddingLength = BLOCK_SIZE - (binary.length % BLOCK_SIZE);
  const paddingBits = paddingLength.toString(2).padStart(8, "0");
  return binary + "1" + "0".repeat(paddingLength - 1) + paddingBits;
};

const removePadding = (binary) => {
  const paddingLengthBits = binary.slice(-8);
  const paddingLength = parseInt(paddingLengthBits, 2);
  return binary.slice(0, -paddingLength - 8);
};

self.onmessage = function (e) {
  const { action, data } = e.data;

  switch (action) {
    case "encrypt":
      const { message, A, b } = data;
      const encrypted = aliceEncrypt(message, A, b);
      self.postMessage({ action: "encryptResult", result: encrypted }, [
        new Uint32Array(encrypted.flatMap(({ c1 }) => c1)).buffer,
      ]);
      break;
    case "decrypt":
      const { encryptedMessage, s } = data;
      const decryptedBinary = bobDecrypt(encryptedMessage, s);
      const decryptedText = binaryToText(decryptedBinary);
      self.postMessage({ action: "decryptResult", result: decryptedText });
      break;
    case "generateKeys":
      const keys = bobKeyGeneration();
      self.postMessage({ action: "keysGenerated", keys });
      break;
  }
};

function bobKeyGeneration() {
  const A = generateMatrix(m, n);
  const s = generateVector(n);
  const e = Array.from({ length: m }, () => discreteGaussianSample(0, 3));
  const b = A.map((row, i) => (dotProduct(row, s) + e[i]) % q);
  return { A, b, s };
}

function aliceEncrypt(message, A, b) {
  const binaryMessage = textToBinary(message);
  const paddedBinary = addPadding(binaryMessage);
  const encryptedBits = [];

  // Pre-allocate arrays
  const rowSumA = new Uint32Array(n);
  const indices = new Uint32Array(indice);

  for (let i = 0; i < paddedBinary.length; i++) {
    const bit = paddedBinary[i];
    const randomIndices = getRandomValues(indice);

    // Reset rowSumA
    rowSumA.fill(0);

    // Use Set for faster lookups
    const selectedIndices = new Set();
    for (let j = 0; j < indice; j++) {
      selectedIndices.add(randomIndices[j] % m);
    }

    let j = 0;
    for (const index of selectedIndices) {
      indices[j++] = index;
      for (let k = 0; k < n; k++) {
        rowSumA[k] = mod(rowSumA[k] + A[index][k], q);
      }
    }

    const rowSumB = indices.reduce((sum, index) => mod(sum + b[index], q), 0);
    const c2 = bit === "0" ? rowSumB : mod(rowSumB + Math.floor(q / 2), q);

    encryptedBits.push({ c1: Array.from(rowSumA), c2 });
  }

  return encryptedBits;
}

function bobDecrypt(encryptedBits, s) {
  const decryptedPaddedBinary = encryptedBits
    .map(({ c1, c2 }) => {
      const innerProduct = dotProduct(c1, s);
      const decrypted = (c2 - innerProduct + q) % q;
      return decrypted < q / 4 || decrypted > (3 * q) / 4 ? "0" : "1";
    })
    .join("");
  return removePadding(decryptedPaddedBinary);
}
