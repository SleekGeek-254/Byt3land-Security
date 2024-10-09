import React, { useState, useEffect, useCallback } from "react";
import { Lock, Unlock, Clock, Loader2 } from "lucide-react";
import "./LatticeEncryption.css";

const LatticeEncryption = () => {
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState({
    correct: "",
    incorrect: "",
  });
  const [timestamps, setTimestamps] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [worker, setWorker] = useState(null);
  const [keys, setKeys] = useState(null);

  useEffect(() => {
    const newWorker = new Worker(
      new URL("./lattice-encryption.worker.js", import.meta.url)
    );
    setWorker(newWorker);

    newWorker.onmessage = (e) => {
      const { action, result, keys } = e.data;
      switch (action) {
        case "encryptResult":
          setEncryptedMessage(JSON.stringify(result));
          break;
        case "decryptResult":
          setDecryptedMessage((prevState) => ({
            ...prevState,
            [keys ? "correct" : "incorrect"]: result,
          }));
          break;
        case "keysGenerated":
          setKeys(keys);
          break;
      }
      setIsLoading(false);
    };

    return () => {
      newWorker.terminate();
    };
  }, []);

  const handleEncrypt = useCallback(async () => {
    if (!worker || !keys) return;

    setIsLoading(true);
    const startEncryption = performance.now();

    worker.postMessage({
      action: "encrypt",
      data: { message, A: keys.A, b: keys.b },
    });

    worker.onmessage = (e) => {
      if (e.data.action === "encryptResult") {
        const endEncryption = performance.now();
        setEncryptedMessage(JSON.stringify(e.data.result));
        setTimestamps((prev) => ({
          ...prev,
          encryption: endEncryption - startEncryption,
        }));

        // Start decryption with correct key
        const startDecryptionCorrect = performance.now();
        worker.postMessage({
          action: "decrypt",
          data: { encryptedMessage: e.data.result, s: keys.s },
        });

        worker.onmessage = (e2) => {
          if (e2.data.action === "decryptResult") {
            const endDecryptionCorrect = performance.now();
            setDecryptedMessage((prev) => ({
              ...prev,
              correct: e2.data.result,
            }));
            setTimestamps((prev) => ({
              ...prev,
              decryptionCorrect: endDecryptionCorrect - startDecryptionCorrect,
            }));

            // Start decryption with incorrect key
            const startDecryptionIncorrect = performance.now();
            const incorrect_s = Array.from({ length: keys.s.length }, () =>
              Math.floor(Math.random() * 4294967291)
            );
            worker.postMessage({
              action: "decrypt",
              data: { encryptedMessage: e.data.result, s: incorrect_s },
            });

            worker.onmessage = (e3) => {
              if (e3.data.action === "decryptResult") {
                const endDecryptionIncorrect = performance.now();
                setDecryptedMessage((prev) => ({
                  ...prev,
                  incorrect: e3.data.result,
                }));
                setTimestamps((prev) => ({
                  ...prev,
                  decryptionIncorrect:
                    endDecryptionIncorrect - startDecryptionIncorrect,
                }));
                setIsLoading(false);
              }
            };
          }
        };
      }
    };
  }, [message, worker, keys]);

  useEffect(() => {
    if (worker) {
      worker.postMessage({ action: "generateKeys" });
    }
  }, [worker]);

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
            <button
              onClick={handleEncrypt}
              className="encrypt-button"
              disabled={isLoading || !keys}
            >
              {isLoading ? (
                <div className="loader-spin"></div>
              ) : (
                <Lock size={16} className="mr-2" />
              )}
              {isLoading ? "Processing..." : "Encrypt"}
            </button>
          </div>

          <div className="bento-box">
            <h2 className="bento-box-title">
              <Lock size={20} />
              Encrypted Message
            </h2>
            <pre className="message-display">
              {"encryptedMessage" || "Encrypted message will appear here"}
            </pre>
          </div>

          <div className="bento-box">
            <h2 className="bento-box-title">
              <Unlock size={20} />
              Decrypted Message
            </h2>
            <div className="message-display decrypted-message decrypted-message-correct">
              <p className="timestamp-label">Correct key:</p>
              <p>{decryptedMessage.correct || "Awaiting decryption..."}</p>
            </div>
            <div className="message-display decrypted-message decrypted-message-incorrect">
              <p className="timestamp-label">Incorrect key:</p>
              <p>{decryptedMessage.incorrect || "Awaiting decryption..."}</p>
            </div>
          </div>

          <div className="timestamps">
            <div className="timestamp">
              <p className="timestamp-label">Encryption time:</p>
              <p className="timestamp-value">
                {timestamps.encryption
                  ? `${timestamps.encryption.toFixed(2)} ms`
                  : "N/A"}
              </p>
            </div>
            <div className="timestamp">
              <p className="timestamp-label">Decryption time (correct):</p>
              <p className="timestamp-value">
                {timestamps.decryptionCorrect
                  ? `${timestamps.decryptionCorrect.toFixed(2)} ms`
                  : "N/A"}
              </p>
            </div>
            <div className="timestamp">
              <p className="timestamp-label">Decryption time (incorrect):</p>
              <p className="timestamp-value">
                {timestamps.decryptionIncorrect
                  ? `${timestamps.decryptionIncorrect.toFixed(2)} ms`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatticeEncryption;
