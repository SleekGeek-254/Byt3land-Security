import React, { useState, useCallback } from 'react';
import { Lock, Unlock, Clock } from 'lucide-react';
import './LatticeEncryption.css';

const q = 4294967291;
const n = 1024;
const m = 4096;
const indice = 10;
const BLOCK_SIZE = 128; // Define a block size for padding

// Secure random number generation using Web Crypto API
const getRandomValues = (length) => {
  const QUOTA = 65536 / 4;
  const array = new Uint32Array(length);
  for (let i = 0; i < length; i += QUOTA) {
    const subLength = Math.min(length - i, QUOTA);
    window.crypto.getRandomValues(array.subarray(i, i + subLength));
  }
  return array;
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
  return Array.from(vector, val => val % q);
};

const dotProduct = (a, b) => {
  let sum = 0n;
  for (let i = 0; i < a.length; i++) {
    sum += BigInt(a[i]) * BigInt(b[i]);
  }
  return Number(sum % BigInt(q));
};


const textToBinary = (text) => {
    return text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  };
  
  const binaryToText = (binary) => {
    return binary.match(/.{1,8}/g).map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
  };
  
  // New padding functions
  const addPadding = (binary) => {
    const paddingLength = BLOCK_SIZE - (binary.length % BLOCK_SIZE);
    const paddingBits = paddingLength.toString(2).padStart(8, '0');
    return binary + '1' + '0'.repeat(paddingLength - 1) + paddingBits;
  };
  
  const removePadding = (binary) => {
    const paddingLengthBits = binary.slice(-8);
    const paddingLength = parseInt(paddingLengthBits, 2);
    return binary.slice(0, -paddingLength - 8);
  };

  const LatticeEncryption = () => {
    const [message, setMessage] = useState('');
    const [encryptedMessage, setEncryptedMessage] = useState('');
    const [decryptedMessage, setDecryptedMessage] = useState('');
    const [timestamps, setTimestamps] = useState({});
  
    const bobKeyGeneration = useCallback(() => {
      const A = generateMatrix(m, n);
      const s = generateVector(n);
      const e = Array.from({ length: m }, () => discreteGaussianSample(0, 3));
      const b = A.map((row, i) => (dotProduct(row, s) + e[i]) % q);
      return { A, b, s };
    }, []);
  
    const aliceEncrypt = useCallback((message, A, b) => {
      const binaryMessage = textToBinary(message);
      const paddedBinary = addPadding(binaryMessage);
      return paddedBinary.split('').map(bit => {
        const selectedIndices = new Set();
        const randomIndices = getRandomValues(indice);
        for (let i = 0; i < indice; i++) {
          selectedIndices.add(randomIndices[i] % m);
        }
        const indices = Array.from(selectedIndices);
        
        const rowSumA = indices.reduce((sum, index) =>
          sum.map((val, i) => (val + A[index][i]) % q), Array(n).fill(0));
        
        const rowSumB = indices.reduce((sum, index) =>
          (sum + b[index]) % q, 0);
          
        const c2 = bit === '0' ? rowSumB : (rowSumB + Math.floor(q / 2)) % q;
        return { c1: rowSumA, c2 };
      });
    }, []);
  
    const bobDecrypt = useCallback((encryptedBits, s) => {
      const decryptedPaddedBinary = encryptedBits.map(({ c1, c2 }) => {
        const innerProduct = dotProduct(c1, s);
        const decrypted = (c2 - innerProduct + q) % q;
        return decrypted < q / 4 || decrypted > 3 * q / 4 ? '0' : '1';
      }).join('');
      return removePadding(decryptedPaddedBinary);
    }, []);
  
    const handleEncrypt = useCallback(() => {
      const startEncryption = performance.now();
      const { A, b, s } = bobKeyGeneration();
      const encrypted = aliceEncrypt(message, A, b);
      const endEncryption = performance.now();
  
      setEncryptedMessage(JSON.stringify(encrypted));
      
      const startDecryptionCorrect = performance.now();
      const decryptedBinary = bobDecrypt(encrypted, s);
      const endDecryptionCorrect = performance.now();
  
      const startDecryptionIncorrect = performance.now();
      const incorrect_s = generateVector(n);
      const incorrectDecryptedBinary = bobDecrypt(encrypted, incorrect_s);
      const endDecryptionIncorrect = performance.now();
  
      setDecryptedMessage({
        correct: binaryToText(decryptedBinary),
        incorrect: binaryToText(incorrectDecryptedBinary)
      });
  
      setTimestamps({
        encryption: endEncryption - startEncryption,
        decryptionCorrect: endDecryptionCorrect - startDecryptionCorrect,
        decryptionIncorrect: endDecryptionIncorrect - startDecryptionIncorrect
      });
    }, [message]);
  

  return (
    <div className="container">
      <div className="content">
        <h1 className="title">Lattice-based Encryption Demo</h1>
        
        <div className="bento-grid">
          <div className="bento-box input-area">
            <h2 className="bento-box-title">
              <Lock size={20} />
              Input
            </h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to encrypt"
              className="input-textarea"
            />
            <button onClick={handleEncrypt} className="encrypt-button">
              <Lock size={16} />
              Encrypt
            </button>
          </div>
          
          <div className="bento-box">
            <h2 className="bento-box-title">
              <Lock size={20} />
              Encrypted Message
            </h2>
            <pre className="message-display">
              {"encryptedMessage" || 'Encrypted message will appear here'}
            </pre>
          </div>
          
          <div className="bento-box">
            <h2 className="bento-box-title">
              <Unlock size={20} />
              Decrypted Message
            </h2>
            <div className="message-display decrypted-message decrypted-message-correct">
              <p className="timestamp-label">Correct key:</p>
              <p>{decryptedMessage.correct || 'Awaiting decryption...'}</p>
            </div>
            <div className="message-display decrypted-message decrypted-message-incorrect">
              <p className="timestamp-label">Incorrect key:</p>
              <p>{decryptedMessage.incorrect || 'Awaiting decryption...'}</p>
            </div>
          </div>
          
          <div className="timestamps">
            <div className="timestamp">
              <p className="timestamp-label">Encryption time:</p>
              <p className="timestamp-value">{timestamps.encryption ? `${timestamps.encryption.toFixed(2)} ms` : 'N/A'}</p>
            </div>
            <div className="timestamp">
              <p className="timestamp-label">Decryption time (correct):</p>
              <p className="timestamp-value">{timestamps.decryptionCorrect ? `${timestamps.decryptionCorrect.toFixed(2)} ms` : 'N/A'}</p>
            </div>
            <div className="timestamp">
              <p className="timestamp-label">Decryption time (incorrect):</p>
              <p className="timestamp-value">{timestamps.decryptionIncorrect ? `${timestamps.decryptionIncorrect.toFixed(2)} ms` : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatticeEncryption;