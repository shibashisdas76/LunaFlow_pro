import CryptoJS from 'crypto-js';

// The Secret Key used to lock/unlock data. 
// In production, NEVER hardcode this. It should be in your .env file!
// Change it to this:
const SECRET_KEY = 'luna-hackathon-secure-key-2026';

// 🔒 LOCK DATA (Encrypt)
export const encryptData = (data: any): string | null => {
  try {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, SECRET_KEY).toString();
  } catch (error) {
    console.error("Encryption failed", error);
    return null;
  }
};

// 🔓 UNLOCK DATA (Decrypt)
export const decryptData = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    // Try to parse it back into a JSON object. If it was just a string, return the string.
    try {
        return JSON.parse(decryptedString);
    } catch {
        return decryptedString;
    }
  } catch (error) {
    console.error("Decryption failed", error);
    return null;
  }
};