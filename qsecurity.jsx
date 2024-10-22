import React, { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Unlock, Clock, Loader2, Save, Key } from "lucide-react";
import pako from "pako";
import { bobKeyGeneration } from "./lattice-encryption.worker.js";
import "./LatticeEncryption.css";

const LatticeEncryption = () => {
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptionButtonContent, setDecryptionButtonContent] = useState(null);
  const [decryptResult_seperate_good, setDecryptResult_seperate_good] =
    useState(null);
  const [decryptResult_seperate_bad, setDecryptResult_seperate_bad] =
    useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState({
    correct: "",
    incorrect: "",
  });
  const [timestamps, setTimestamps] = useState({});
  const fallbackRef = useRef(false);
  const completefailRef = useRef(false);
  const [magic, setMagic] = useState(1);
  const [encFinsied, setEncFinsied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [worker, setWorker] = useState(null);
  const [keys, setKeys] = useState(null);
  const [file, setFile] = useState(false); // New state to hold the uploaded file

  const [worker_Population, setworker_Population] = useState(75);

  useEffect(() => {
    const newWorker = new Worker(
      new URL("./lattice-encryption.worker.js", import.meta.url),
      { type: "module" }
    );
    setWorker(newWorker);

    // wokrer psuedo limit
    const getWorkerCount = () => {
      const maxWorkers = navigator.hardwareConcurrency || 69; // Fallback to 69 if not supported
      const browser_type = navigator.userAgent; // Fallback to 4 if not supported
      // console.log(`Broswer Data: \n maxWorkers ${maxWorkers} \n browser_type: ${browser_type}`);
      // Detect Safari using vendor or userAgent
      const isSafari =
        /Safari/.test(navigator.userAgent) &&
        /Apple Computer/.test(navigator.vendor);

      if (isSafari) {
        // Set the worker population to 30 if Safari
        setworker_Population(42);
        console.log("Safari detected, limiting workers to 30");
      } else if (maxWorkers >= 12) {
        setworker_Population(75);
      } else {
        setworker_Population(maxWorkers);
      }
      return; //Math.min(maxWorkers, 75); // Limit to a maximum of 42 workers
    };

    getWorkerCount();
  }, []);

  const specialCharMap = {
    "`": "##&bktk##",
    "’": "##&ter##",
    "@": "##&MOST##",
    "�": "##&UKWN##",
    "𝜓": "##&PSIDEON##",
    "⟩": "##&SDEPIPE##",
    "∣": "##&PPE##",
    " ": "##&s-s##",
    "\n": "##&n-n##",
    α: "##&ALPHA##",
    β: "##&BETA##",
    γ: "##&GAMMA##",
    δ: "##&DELTA##",
    σ: "##&SIGMA##",
    π: "##&PI##",
    "°": "##&DEGREE##",
    µ: "##&MU##",
    "±": "##&PLUSMINUS##",
    "∞": "##&INFINITY##",
    Ω: "##&OMEGA##",
    λ: "##&LAMBDA##",
    "∑": "##&SUM##",
    "√": "##&SQRT##",
    "∏": "##&PRODUCT##",
    "≤": "##&LESSTHANEQ##",
    "≥": "##&GREATERTHANEQ##",
    "÷": "##&DIVIDE##",
    "×": "##&MULTIPLY##",
    "∆": "##&DELTAUPPER##",
    τ: "##&TAU##",
    φ: "##&PHI##",
    Φ: "##&PHIUPPER##",
    ε: "##&EPSILON##",
    Ε: "##&EPSILONUPPER##",
    θ: "##&THETA##",
    Θ: "##&THETAUPPER##",
    ψ: "##&PSI##",
    Ψ: "##&PSIUPPER##",
    ξ: "##&XI##",
    Ξ: "##&XIUPPER##",
    ζ: "##&ZETA##",
    Ζ: "##&ZETAUPPER##",
    η: "##&ETA##",
    Η: "##&ETAUPPER##",
    χ: "##&CHI##",
    Χ: "##&CHIUPPER##",
    ρ: "##&RHO##",
    Ρ: "##&RHOUPPER##",

    // More Greek letters
    κ: "##&KAPPA##",
    Κ: "##&KAPPAUPPER##",
    ν: "##&NU##",
    Ν: "##&NUUPPER##",
    ς: "##&SIGMAFINAL##",
    ϕ: "##&PHISYMBOL##",

    // Mathematical Symbols
    "∅": "##&EMPTYSET##",
    "∈": "##&ELEMENTOF##",
    "∉": "##&NOTELEMENTOF##",
    "⊆": "##&SUBSETOF##",
    "⊂": "##&PROBERSUBSETOF##",
    "⊇": "##&SUPERSETOF##",
    "⊃": "##&PROBERSUPERSETOF##",
    "∩": "##&INTERSECTION##",
    "∪": "##&UNION##",
    "⊕": "##&DIRECTSUM##",
    "∧": "##&LOGICALAND##",
    "∨": "##&LOGICALOR##",
    "≦": "##&LESSEQUAL##",
    "≧": "##&GREATEREQUAL##",
    "¬": "##&NOT##",
    "⇒": "##&IMPLIES##",
    "⇔": "##&IFANDONLYIF##",

    // Other Mathematical Symbols
    "≠": "##&NOTEQUAL##",
    "≈": "##&APPROX##",
    "∝": "##&PROPORTIONAL##",
    "∫": "##&INTEGRAL##",
    "∂": "##&PARTIAL##",
    "∇": "##&NABLA##",
    "∀": "##&FORALL##",
    "∃": "##&THEREEXISTS##",

    // Arrows
    "→": "##&RIGHTARROW##",
    "←": "##&LEFTARROW##",
    "↑": "##&UPARROW##",
    "↓": "##&DOWNARROW##",
    "↔": "##&LEFTRIGHTARROW##",
    "↕": "##&UPDOWNARROW##",
    "⇌": "##&EQUILIBRIUMARROW##",

    // Money symbols
    "£": "##&POUND##",
    "€": "##&EURO##",
    "¥": "##&YEN##",
    "₱": "##&PHILIPPINEPESO##",
    "₹": "##&INDIANRUPEE##",
    "₩": "##&SOUTHKOREANWON##",
    "₼": "##&AZERBAIJANIMANAT##",

    // Miscellaneous Symbols
    "♥": "##&HEART##",
    "★": "##&STAR##",
    "♠": "##&SPADE##",
    "♣": "##&CLUB##",
    "♦": "##&DIAMOND##",
    "☯": "##&YINYANG##",
    "☀": "##&SUN##",
    "☂": "##&UMBRELLA##",

    // Punctuation Marks
    "«": "##&LEFTANGLEQUOTE##",
    "»": "##&RIGHTANGLEQUOTE##",
    "•": "##&BULLET##",
    "…": "##&ELLIPSIS##",
    "—": "##&EMDASH##",
    "–": "##&ENDASH##",
    "⁂": "##&ASTERISK##",
  };

  const specialCharMapFixer = {
    "@": "",
    " ": "",
    "`": "",
  };

  //const NUMBER_OF_WORKERS = 75;

  const CHUNK_SIZE = 16; // 256 bits = 32 characters (8 bits per char)

  const handleNewKeyGeneration = async () => {
    setIsLoading(true);

    const generatedNewKeys = bobKeyGeneration();
    // console.log(`New keys ${JSON.stringify(generatedNewKeys)}`);

    setKeys(generatedNewKeys);
    alert("New Keys Generated and Set");
    setFile(false);
    setIsLoading(false);
  };

  const chunkMessage = (message) => {
    const chunks = [];
    for (let i = 0; i < message.length; i += CHUNK_SIZE) {
      chunks.push(message.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = new Uint8Array(e.target.result); // Read as binary
          let uploadedKeys;

          // Check if the file is compressed (simple heuristic)
          if (isCompressed(fileContent)) {
            // Decompress the uploaded file content
            const decompressedKeys = pako.inflate(fileContent, {
              to: "string",
            });
            uploadedKeys = JSON.parse(decompressedKeys);
          } else {
            // Parse the file content as JSON directly
            const textContent = new TextDecoder().decode(fileContent);
            uploadedKeys = JSON.parse(textContent);
          }

          setKeys(uploadedKeys); // Update the keys state with uploaded keys
          setFile(true);
          console.log("Keys uploaded:", uploadedKeys);
          setIsLoading(false);

        } catch (error) {
          console.error("Failed to parse keys:", error);
        }
      };
      reader.readAsArrayBuffer(uploadedFile); // Use readAsArrayBuffer to read binary data
    }
  };

  // A simple heuristic function to check if the data is compressed
  const isCompressed = (data) => {
    // Check for common signatures of compressed data
    // For example, gzip compressed data usually starts with 0x1F 0x8B
    return data[0] === 0x1f && data[1] === 0x8b;
  };

  const substituteSpecialChars = (message) => {
    let result = message;
    for (const [char, substitute] of Object.entries(specialCharMap)) {
      result = result.replace(new RegExp(char, "g"), substitute);
    }
    return result;
  };

  const substituteSpecialCharsFixer = (message) => {
    let result = message;
    for (const [char, substitute] of Object.entries(specialCharMapFixer)) {
      // Create a regex that matches the exact character
      result = result.replace(new RegExp(`[${char}]`, "g"), substitute);
    }

    // Replace any single character between hashes with nothing, but keep the hashes
    result = result.replace(/#([^#])#&/g, "##&");
    result = result.replace(/##&([^#])s-s##/g, "##&s-s##");
    result = result.replace(/##&s-s([^#])##/g, "##&s-s##");
    result = result.replace(/##&s([^#])-s##/g, "##&s-s##");
    result = result.replace(/##&s-([^#])s##/g, "##&s-s##");

    return result;
  };

  const restoreSpecialChars = (message) => {
    let result = message;
    for (const [char, substitute] of Object.entries(specialCharMap)) {
      result = result.replace(new RegExp(substitute, "g"), char);
    }
    return result;
  };

  const saveKeysToFile = async (keys) => {
    const keysString = JSON.stringify(keys, null, 2);

    // Compress the string using pako
    const compressedKeys = pako.deflate(keysString, { to: "string" }); // Use 'string' to get a UTF-8 string

    const blob = new Blob([compressedKeys], {
      type: "application/octet-stream",
    }); // Change to application/octet-stream for binary data
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "keys.json";
    link.click();
  };

  const handleDecrypt = useCallback(async () => {
    if (!worker || !keys || !decryptionButtonContent) return;

    setIsLoading(true);
    const startDecryption = performance.now();

    worker.postMessage({
      action: "decrypt[seperate]",
      data: {
        encryptedMessage_seperate: decryptionButtonContent,
        s_seperate: keys.s,
      },
    });

    const endsDecryption = performance.now();
    console.log(`Decryt time ${endsDecryption - startDecryption}`);

    worker.onmessage = async (e) => {
      if (e.data.action === "decryptResultseperate") {
        //console.log(`actions : ${e.data.action}`);
        //console.log(`Received decryptResultseperate: ${e.data.result_good}`);
        setDecryptResult_seperate_good(
          restoreSpecialChars(substituteSpecialCharsFixer(e.data.result_good))
        ); // Set the result in the state
        setDecryptResult_seperate_bad(
          restoreSpecialChars(substituteSpecialCharsFixer(e.data.result_bad))
        ); // Set the result in the state

        setIsLoading(false);
      }
    };
  }, [worker, keys, decryptionButtonContent]);

  const encryptChunk = async (chunk, keys, worker) => {
    let isValidEncryption = false;
    let encryptedChunk = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isValidEncryption && attempts < maxAttempts) {
      attempts++;
      try {
        // Encrypt the chunk
        const encryptResult = await new Promise((resolve) => {
          worker.postMessage({
            action: "encrypt",
            data: {
              message: chunk,
              A: keys.A,
              b: keys.b,
            },
          });

          const handleEncryptMessage = (e) => {
            if (e.data.action === "encryptResult") {
              worker.onmessage = null;
              resolve(e.data.result);
            }
          };

          worker.onmessage = handleEncryptMessage;
        });

        // Test decrypt the chunk
        const decryptResult = await new Promise((resolve) => {
          worker.postMessage({
            action: "decrypt",
            data: {
              encryptedMessage: encryptResult,
              s: keys.s,
              attempts: 1,
            },
          });

          const handleDecryptMessage = (e) => {
            if (e.data.action === "decryptResult") {
              worker.onmessage = null;
              resolve(e.data.result);
            }
          };

          worker.onmessage = handleDecryptMessage;
        });

        // Validate if decryption matches original chunk
        if (decryptResult === chunk) {
          isValidEncryption = true;
          encryptedChunk = encryptResult;
          // console.log(
          //   `Successfully encrypted:
          //   \n DecryptResult:${decryptResult}
          //   \n Chunk: ${chunk}
          //   \n after Attempt ${attempts}`
          // );
          console.log(
            `Successfully encrypted after Attempt  ${attempts} \n Chunk: ${chunk} `
          );
        }
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
      }
    }

    if (!isValidEncryption) {
      if (fallbackRef.current) {
        console.error(`Failed to encrypt chunk after[Even with sequential] ${maxAttempts} attempts 
          \n If issue perssits please try again later`);
        completefailRef.current = true;
      } else {
        fallbackRef.current = true;
        console.log(`Failed to encrypt chunk after ${maxAttempts} attempts`);
      }
    }

    return encryptedChunk;
  };

  const handleEncrypt = useCallback(async () => {
    if (!keys) return;

    const preprocessedMessage = substituteSpecialChars(message);
    setIsLoading(true);
    const startEncryption = performance.now();
    const messageChunks = chunkMessage(preprocessedMessage);

    try {
      let combinedEncryptedData;

      // Original parallel processing for small messages
      if (
        messageChunks.length < worker_Population / magic &&
        !fallbackRef.current
      ) {
        console.log(
          `|| Full Parallel Route with ${messageChunks.length} bytes`
        );
        const dynamicWorkers = Array.from(
          { length: worker_Population },
          () =>
            new Worker(
              new URL("./lattice-encryption.worker.js", import.meta.url),
              { type: "module" }
            )
        );

        const chunkPromises = messageChunks.map((chunk, index) =>
          encryptChunk(chunk, keys, dynamicWorkers[index % worker_Population])
        );

        const encryptedChunks = await Promise.all(chunkPromises);
        dynamicWorkers.forEach((worker) => worker.terminate());

        if (!encryptedChunks.includes(null)) {
          combinedEncryptedData = encryptedChunks.flat();
        } else {
          combinedEncryptedData = null;
        }
      }
      // Split parallel processing for larger messages into 4 sets
      else if (!fallbackRef.current) {
        console.log(
          `|| Split Parallel Route (4 sets) with ${messageChunks.length} bytes`
        );

        // Split chunks into four sets
        const chunkSize = Math.ceil(messageChunks.length / 4);
        const sets = [
          messageChunks.slice(0, chunkSize), // First set
          messageChunks.slice(chunkSize, chunkSize * 2), // Second set
          messageChunks.slice(chunkSize * 2, chunkSize * 3), // Third set
          messageChunks.slice(chunkSize * 3), // Fourth set
        ];

        let allResults = [];

        // Process each set sequentially
        for (let setIndex = 0; setIndex < sets.length; setIndex++) {
          console.log(
            `Processing set ${setIndex + 1} of 4: ${
              sets[setIndex].length
            } chunks`
          );

          // Create workers for this set only
          const currentSetWorkers = Array.from(
            { length: worker_Population },
            () =>
              new Worker(
                new URL("./lattice-encryption.worker.js", import.meta.url),
                { type: "module" }
              )
          );

          try {
            // Process all chunks in current set in parallel
            const setPromises = sets[setIndex].map((chunk, index) =>
              encryptChunk(
                chunk,
                keys,
                currentSetWorkers[index % sets[setIndex].length]
              )
            );

            // Wait for all chunks in this set to complete
            const setResults = await Promise.all(setPromises);

            // Validate results for this set
            if (setResults.includes(null)) {
              console.log(
                `Set ${
                  setIndex + 1
                } encryption failed, falling back to sequential`
              );
              allResults = [];
              fallbackRef.current = true;
              break;
            }

            // Add results from this set to overall results
            allResults.push(...setResults);
          } catch (error) {
            console.error(`Error processing set ${setIndex + 1}:`, error);
            fallbackRef.current = true;
            allResults = [];
            break;
          } finally {
            // Clean up workers for this set before moving to next set
            currentSetWorkers.forEach((worker) => worker.terminate());
          }
        }

        if (allResults.length === messageChunks.length) {
          combinedEncryptedData = allResults.flat();
        } else {
          console.log(
            "Split parallel processing failed, falling back to sequential"
          );
          combinedEncryptedData = null;
          fallbackRef.current = true;
        }
      }
      // Sequential processing fallback
      else {
        console.log(`|| Sequential Route with ${messageChunks.length} bytes`);

        let encryptedChunks = [];
        for (
          let i = 0;
          i < messageChunks.length && !completefailRef.current;
          i++
        ) {
          console.log(`Processing chunk ${i + 1}/${messageChunks.length}`);
          const chunk = messageChunks[i];
          const encryptedChunk = await encryptChunk(chunk, keys, worker);

          if (encryptedChunk === null) {
            console.log("Sequential encryption failed");
            encryptedChunks = [];
            completefailRef.current = true;
            break;
          }
          encryptedChunks.push(encryptedChunk);
        }

        if (encryptedChunks.length === messageChunks.length) {
          combinedEncryptedData = encryptedChunks.flat();
          fallbackRef.current = false;
        }
      }

      // Handle results and continue with existing post-processing
      if (fallbackRef.current && !completefailRef.current) {
        console.log("Falling back to sequential processing");
        handleEncrypt();
      } else if (!completefailRef.current && combinedEncryptedData) {
        const endEncryption = performance.now();

        setEncryptedMessage(JSON.stringify(combinedEncryptedData));
        setDecryptionButtonContent(combinedEncryptedData);

        setTimestamps((prev) => ({
          ...prev,
          encryption: endEncryption - startEncryption,
        }));

        // Validate the entire message
        const startDecryptionCorrect = performance.now();

        // Create a Promise for correct key decryption
        const correctKeyDecryption = new Promise((resolve) => {
          worker.postMessage({
            action: "decrypt",
            data: {
              encryptedMessage: combinedEncryptedData,
              s: keys.s,
              attempts: 1,
            },
          });

          const handleDecryptMessage = (e) => {
            if (e.data.action === "decryptResult") {
              worker.onmessage = null;
              resolve(e.data.result);
            }
          };

          worker.onmessage = handleDecryptMessage;
        });

        const decryptedCorrect = await correctKeyDecryption;
        const endDecryptionCorrect = performance.now();

        setDecryptedMessage((prev) => ({
          ...prev,
          correct: decryptedCorrect,
        }));

        setTimestamps((prev) => ({
          ...prev,
          decryptionCorrect: endDecryptionCorrect - startDecryptionCorrect,
        }));

        // Save keys if validation successful and not using uploaded keys
        if (!completefailRef.current && !file) {
          await saveKeysToFile(keys);
          console.log("Keys Saved");
        }

        // Test with incorrect key
        const startDecryptionIncorrect = performance.now();
        const incorrect_s = Array.from({ length: keys.s.length }, () =>
          Math.floor(Math.random() * 4294967291)
        );

        const incorrectKeyDecryption = new Promise((resolve) => {
          worker.postMessage({
            action: "decrypt",
            data: {
              encryptedMessage: combinedEncryptedData,
              s: incorrect_s,
              attempts: 1,
            },
          });

          const handleDecryptMessage = (e) => {
            if (e.data.action === "decryptResult") {
              worker.onmessage = null;
              resolve(e.data.result);
            }
          };

          worker.onmessage = handleDecryptMessage;
        });

        const decryptedIncorrect = await incorrectKeyDecryption;
        const endDecryptionIncorrect = performance.now();

        setDecryptedMessage((prev) => ({
          ...prev,
          incorrect: decryptedIncorrect,
        }));

        setTimestamps((prev) => ({
          ...prev,
          decryptionIncorrect:
            endDecryptionIncorrect - startDecryptionIncorrect,
        }));

        console.log("Completeed Encryption and Test...");
      } else {
        console.log(
          `Failed both Sequential and Parallel \n If issue persits close your goddam Tabs... please try again later`
        );
      }
    } catch (error) {
      console.error("Encryption process failed:", error);
    } finally {
      setEncFinsied(true);
      setIsLoading(false);
    }
  }, [message, worker, keys, file]);

  useEffect(() => {
    if (encFinsied && !isLoading) {
      // console.log(
      //   `Pre pako decryptedMessage.correct: ${decryptedMessage.correct}`
      // );
      // console.log(
      //   `Pre pako decryptedMessage.incorrect: ${decryptedMessage.incorrect}`
      // );

      // // use pako to unpack it herethen thats when you do the restoreSpecialChracters
      // //const decompressedData1 = pako.inflate(decryptedMessage.correct, { to: 'string' });
      // //const decompressedData2 = pako.inflate(decryptedMessage.incorrect, { to: 'string' });

      // console.log(
      //   `Post pako decryptedMessage.correct: ${decryptedMessage.correct}`
      // );
      // console.log(
      //   `Post pako decryptedMessage.incorrect: ${decryptedMessage.incorrect}`
      // );

      setDecryptedMessage({
        correct: restoreSpecialChars(
          substituteSpecialCharsFixer(decryptedMessage.correct)
        ),
        incorrect: restoreSpecialChars(
          substituteSpecialCharsFixer(decryptedMessage.incorrect)
        ),
      });

      setEncFinsied(false);
    }
  }, [encFinsied, isLoading]);

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
            <div className="Flex GAP">
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
              <button
                onClick={handleDecrypt}
                className="encrypt-button"
                disabled={isLoading || !keys || !encryptedMessage}
              >
                {isLoading ? (
                  <div className="loader-spin"></div>
                ) : (
                  <Lock size={16} className="mr-2" />
                )}
                {isLoading ? "Processing..." : "Decrypt"}
              </button>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input"
              />
              <button
                className="encrypt-button"
                disabled={isLoading}
                onClick={() => handleNewKeyGeneration()}
              >
                {isLoading ? (
                  <div className="loader-spin"></div>
                ) : (
                  <Key size={16} className="mr-2" />
                )}
                {isLoading ? "Processing..." : `Generate_new_keys`}
              </button>
              <button
                className="encrypt-button"
                disabled={isLoading}
                onClick={() => setMagic((1 + Math.random()).toFixed(1))}
              >
                {isLoading ? "Processing..." : `magicNumber(${magic})`}
              </button>
            </div>
            {/* <button
              onClick={s_aveKeysToFile_(keys)}
              className=""
              disabled={isLoading || !keys}
            >
              {isLoading ? (
                <div className="loader-spin"></div>
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Save keys
            </button> */}
          </div>

          {/* <div className="bento-box">
            <h2 className="bento-box-title">
              <Lock size={20} />
              Encrypted Message
            </h2>
            <pre className="message-display">
              {encryptedMessage || "Encrypted message will appear here"}
            </pre>
          </div> */}

          <div className="bento-box">
            <h2 className="bento-box-title">
              <Unlock size={20} />
              Direct Encyrpt Output
            </h2>
            <div className="message-display decrypted-message decrypted-message-correct">
              <p className="timestamp-label">Best Result (Correct key):</p>
              <p>{decryptedMessage.correct || "Awaiting decryption..."}</p>
            </div>
            <div className="message-display decrypted-message decrypted-message-incorrect">
              <p className="timestamp-label">Best Result (Incorrect key):</p>
              <p>{decryptedMessage.incorrect || "Awaiting decryption..."}</p>
            </div>
          </div>

          <div className="bento-box">
            <h2 className="bento-box-title">
              <Unlock size={20} />
              Decrypted Button Data
            </h2>
            <div className="message-display decrypted-message decrypted-message-correct">
              <p className="timestamp-label">
                Button decrypt data (Correct key):
              </p>
              <p>{decryptResult_seperate_good || "Awaiting decryption..."}</p>
            </div>
            <div className="message-display decrypted-message decrypted-message-incorrect">
              <p className="timestamp-label">Button decrypt data (Bad key):</p>
              <p>{decryptResult_seperate_bad || "Awaiting decryption..."}</p>
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
