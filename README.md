# REACT-APP Lattice-based Encryption Demo

This project demonstrates a basic implementation of lattice-based encryption using the Learning With Errors (LWE) problem. It's designed as an educational tool to explore post-quantum cryptography concepts.

## Table of Contents

- [Overview](#overview)
- [Features](#features) 
- [Usage](#usage)
- [Security Analysis](#security-analysis)
- [Additional Findings](#additional-findings)
- [Future Implementations](#future-implementations)
- [Disclaimer](#disclaimer)
- [License](#license)


## Overview
![image](https://github.com/user-attachments/assets/76a554d8-76dc-4fdf-b683-cc8fe2832cdb)


This React-based web application showcases a simple lattice-based encryption system. Users can input a message, encrypt it using LWE-based encryption, and then decrypt it using both correct and incorrect keys to demonstrate the system's functionality.

## Features

- Message encryption using lattice-based cryptography
- Message decryption with correct and incorrect keys
- Real-time display of encryption and decryption times
- Secure random number generation using Web Crypto API
- Constant-time discrete Gaussian sampling

## Usage

1. **Enter Message**: Type a message into the input field.
2. **Encrypt**: Click the "Encrypt" button to secure the message.
3. **View Results**: Observe the encrypted message and decryption attempts.
4. **Analyze Performance**: Review encryption and decryption timings for insights.

## Security Analysis

This project explores basic lattice cryptography principles but should not be used in production environments due to security limitations. Below is a security assessment comparing it to requirements for a secure, efficient lattice-based scheme (like Kyber):

### 1. **LWE Foundation**
   - **Compliance**: ✅ Implemented using the Regev LWE structure with matrix `A`, secret `s`, and error vector `e`.

### 2. **Efficiency Optimization (Distribution & Matrix Dimensions)**
   - **Compliance**: ⚠️ Rectangular matrix structure (`4096 x 1024`) is used. Kyber uses square matrices for efficiency, which could be implemented here for better performance.

### 3. **Ring-LWE and Module-LWE Efficiency**
   - **Compliance**: ❌ Lacks ring or module structures. Incorporating polynomial ring structures can improve performance.

### 4. **CPA and CCA Security**
   - **Compliance**: ⚠️ CPA-secure but lacks CCA protections such as Fujisaki-Okamoto transformations to prevent chosen-ciphertext attacks.

### 5. **Secure Random Sampling**
   - **Compliance**: ✅ Uses Web Crypto API, providing secure randomness.

### 6. **Constant-Time Operations**
   - **Compliance**: ⚠️ Certain operations may not be constant-time, which is critical to prevent timing attacks.

### Evaluation Summary

| Requirement                   | Compliance Level            |
|-------------------------------|-----------------------------|
| LWE Foundation                | ✅ Fully compliant          |
| Efficiency Optimizations      | ⚠️ Partially compliant      |
| Ring/Module Structures        | ❌ Non-compliant            |
| CPA Security                  | ✅ Fully compliant          |
| CCA Security                  | ⚠️ Partially compliant      |
| Secure Random Sampling        | ✅ Fully compliant          |
| Constant-Time Operations      | ⚠️ Partially compliant      |

### Strengths

- Secure random generation via Web Crypto API.
- Basic padding implementation.
- Demonstration of quantum-resistant lattice cryptography.

### Areas for Improvement

1. **Parameter Selection**: Further analysis of security implications for current parameters (e.g., `q`, `n`).
2. **Side-Channel Resistance**: Ensure all operations are constant-time.
3. **Frontend Cryptography Exposure**: Frontend cryptographic operations may be vulnerable to tampering.
4. **Error Handling and Robustness**: Improve error handling for unexpected inputs.

For a detailed analysis, refer to the [Security Analysis document](SECURITY_ANALYSIS.md).

## Additional Findings

- **Performance**: Matrix operations and Gaussian sampling can create performance bottlenecks, especially with larger datasets.
- **Browser Compatibility**: The Web Crypto API may limit compatibility with older browsers.
- **Memory Usage**: Optimization may be needed to manage large matrix operations on resource-limited devices.

## Future Implementations

1. **Dynamic Parameter Selection**: Introduce dynamic security-level-based parameter selection.
2. **Advanced Message Encoding**: Consider error-correcting codes for message encoding.
3. **Authentication Mechanisms**: Integrate lattice-based signatures or MACs for message integrity.
4. **Key Management**: Develop a robust key generation, storage, and rotation system.
5. **Constant-Time Optimizations**: Review all operations to ensure they run in constant time.
6. **Hybrid Encryption Scheme**: Combine symmetric and lattice-based encryption for large message efficiency.
7. **Backend Integration**: Move cryptographic operations to a secure backend.
8. **Educational Visualizations**: Add interactive visualizations to illustrate key concepts of lattice-based cryptography.

## Disclaimer

This project is for educational purposes only and is not intended for securing sensitive data or production use. It has not undergone a formal security audit and may contain vulnerabilities.

## License

This project is licensed under the [GNU Affero General Public License v3.0 (GNU AGPLv3)](https://www.gnu.org/licenses/agpl-3.0.html). Any modifications must be distributed under the same license, with the complete source code made available if used in networked services.
