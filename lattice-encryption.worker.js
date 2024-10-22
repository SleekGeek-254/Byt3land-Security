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

// [unused for now]Memoize the discreteGaussianSample function
// const memoizedDiscreteSample = (() => {
//   const cache = new Map();
//   return (mean = 0, sigma = 1) => {
//     const key = `${mean},${sigma}`;
//     if (!cache.has(key)) {
//       cache.set(key, discreteGaussianSample(mean, sigma));
//     }
//     return cache.get(key);
//   };
// })();

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
    .map(byte => {
      const charCode = parseInt(byte, 2);
      // Only convert to character if it's in the printable ASCII range (32-126)
      return (charCode >= 32 && charCode <= 126) ? 
        String.fromCharCode(charCode) : 
        ''; // Replace non-printable characters with space
    })
    .join('');
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

// Helper function: Check if a character is printable
const isPrintableChar = (char) =>
  char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126;

// Helper function: Count the number of words in a message
const countWords = (message) => {
  return message.split(/\s+/).filter((word) => word.length > 0).length;
};

// Helper function: Perform a simple frequency analysis of common English letters
const commonLetterFrequency = (message) => {
  const frequencies = {
    e: 12.7,
    t: 9.06,
    a: 8.17,
    o: 7.51,
    i: 6.97,
    n: 6.75,
    s: 6.33,
    h: 6.09,
    r: 5.99,
    d: 4.25,
    l: 4.03,
    c: 2.78,
    u: 2.76,
    m: 2.41,
  };
  const lowerMessage = message.toLowerCase();
  let score = 0;

  for (let char of lowerMessage) {
    if (frequencies[char]) {
      score += frequencies[char];
    }
  }

  return score;
};

// Helper function: Score the message based on multiple factors
const scoreMessage = (message) => {
  // Calculate valid printable characters
  const validChars = [...message].filter(isPrintableChar).length;

  // Calculate word count
  const wordCount = countWords(message);

  // Perform letter frequency analysis for English
  const letterFrequencyScore = commonLetterFrequency(message);

  // Calculate a final weighted score (weights can be adjusted)
  return validChars * 0.5 + wordCount * 0.3 + letterFrequencyScore * 0.2;
};

// Final function: Find the most "complete" decrypted message
const findMostCompleteMessage = (messages) => {
  // Filter out empty messages
  const validMessages = messages.filter((msg) => msg.trim() !== "");

  if (validMessages.length === 0) {
    return ""; // Return empty string if no valid messages
  }

  // Reduce the messages to find the one with the highest score
  return validMessages.reduce((best, current) => {
    const bestScore = scoreMessage(best);
    const currentScore = scoreMessage(current);

    return currentScore > bestScore ? current : best;
  });
};

// Function to generate a variation of the correct key
const modifyKey = (originalKey, variationStrength = 1) => {
  // Create a new key by slightly modifying each element of the original key
  return originalKey.map((val) =>
    mod(val + discreteGaussianSample(0, variationStrength), q)
  );
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
    case "decrypt[seperate]":
      const { encryptedMessage_seperate, s_seperate } = data;

      let decryptedText_seperate_good;
      let decryptedText_seperate_bad;

      // bad decrypt test
      let modified_badkey_s = modifyKey(s_seperate, 2);
      const decryptedBinary_seperate_bad = bobDecrypt(
        encryptedMessage_seperate,
        modified_badkey_s
      );

      const decryptedBinary_seperate_good = bobDecrypt(
        encryptedMessage_seperate,
        s_seperate
      );

      if (decryptedBinary_seperate_good) {
        decryptedText_seperate_good = binaryToText(
          decryptedBinary_seperate_good
        );
      } else {
        decryptedText_seperate_good = "bobDecrypt Good Failed";
      }

      if (decryptedBinary_seperate_bad) {
        decryptedText_seperate_bad = binaryToText(decryptedBinary_seperate_bad);
      } else {
        decryptedText_seperate_bad = "bobDecrypt Bad Failed";
      }

      self.postMessage({
        action: "decryptResultseperate",
        result_good: decryptedText_seperate_good,
        result_bad: decryptedText_seperate_bad,
      });

      break;
    case "decrypt":
      const { encryptedMessage, s, attempts } = data;
      const decryptionResults = [];

      // // Perform multiple decryption attempts
      // for (let i = 0; i < attempts; i++) {
      //   decryptionResults.push(decryptedText);
      // }
      let decryptedText;
      const decryptedBinary = bobDecrypt(encryptedMessage, s);
      if (decryptedBinary) {
        const decryptedText_raw = binaryToText(decryptedBinary);
        // Apply the ASCII filter directly to the string
        decryptedText = decryptedText_raw.replace(/[^\x00-\x7F]/g, "");
      } else {
        //console.log(`decryptedBinary failed with null ${decryptedBinary}`);
        decryptedText = "empty stuff";
      }
      // // Perform multiple decryption attempts
      // for (let i = 0; i < attempts; i++) {
      //   let keyToUse = s;

      //   if (i > 0) {
      //     // Use a variation of the key after the first attempt
      //     keyToUse = modifyKey(s, 0); // You can adjust the variation strength (3 in this case)
      //   }

      //   const decryptedBinary = bobDecrypt(encryptedMessage, keyToUse);
      //   const decryptedText = binaryToText(decryptedBinary);
      //   decryptionResults.push(decryptedText);
      // }
      //const bestResult = findMostCompleteMessage(decryptedText);

      self.postMessage({
        action: "decryptResult",
        result: decryptedText,
        // allResults: decryptionResults,
      });
      break;
    case "generateKeys":
      const keys = bobKeyGeneration();
      self.postMessage({ action: "keysGenerated", keys });
      break;
  }
};

export function bobKeyGeneration() {
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

  // Split padded binary into blocks
  const numBlocks = Math.ceil(paddedBinary.length / BLOCK_SIZE);

  for (let blockIndex = 0; blockIndex < numBlocks; blockIndex++) {
    const block = paddedBinary.slice(
      blockIndex * BLOCK_SIZE,
      (blockIndex + 1) * BLOCK_SIZE
    );

    for (let i = 0; i < block.length; i++) {
      const bit = block[i];
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
  }

  return encryptedBits;
}

function bobDecrypt(encryptedBits, s) {
  const decryptedPaddedBinary = [];

  // Process each encrypted bit
  for (const { c1, c2 } of encryptedBits) {
    const innerProduct = dotProduct(c1, s);
    const decrypted = (c2 - innerProduct + q) % q;
    decryptedPaddedBinary.push(
      decrypted < q / 4 || decrypted > (3 * q) / 4 ? "0" : "1"
    );
  }

  // Join decrypted bits and remove padding
  const fullDecryptedBinary = decryptedPaddedBinary.join("");
  return removePadding(fullDecryptedBinary);
}
