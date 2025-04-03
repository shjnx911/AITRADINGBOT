import { Request, Response, NextFunction } from 'express';
import { encrypt, decrypt, maskSensitiveData } from './encryption';

/**
 * Middleware to encrypt API keys when they're stored in the database
 * This ensures API keys are never stored in plain text
 */
export function encryptApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if this request contains API keys that need to be encrypted
    if (req.body && (req.body.apiKey || req.body.secretKey)) {
      // Encrypt API keys before storing
      if (req.body.apiKey) {
        req.body.apiKey = encrypt(req.body.apiKey);
      }
      
      if (req.body.secretKey) {
        req.body.secretKey = encrypt(req.body.secretKey);
      }
    }
    
    next();
  } catch (error) {
    console.error('API key encryption error:', error);
    next(error);
  }
}

/**
 * Middleware to decrypt API keys when they're returned from the database
 * This allows the keys to be used for API calls while still being secure in storage
 */
export function decryptApiKeysForUse(req: Request, res: Response, next: NextFunction) {
  try {
    // Intercept the response to decrypt API keys before sending to client
    const originalJson = res.json;
    
    res.json = function(body) {
      // Check if response contains encrypted API keys
      if (body && typeof body === 'object') {
        // For single objects with API keys
        if (body.apiKey && typeof body.apiKey === 'string' && body.apiKey.includes(':')) {
          try {
            // Store the original encrypted value
            const encryptedApiKey = body.apiKey;
            
            // For response to client, mask the key
            body.apiKey = maskSensitiveData(decrypt(encryptedApiKey));
            
            // For API calls we might need the actual key (stored in a non-returned property)
            body._decryptedApiKey = decrypt(encryptedApiKey);
          } catch (e) {
            console.error('Error decrypting API key:', e);
          }
        }
        
        if (body.secretKey && typeof body.secretKey === 'string' && body.secretKey.includes(':')) {
          try {
            // Store the original encrypted value
            const encryptedSecretKey = body.secretKey;
            
            // For response to client, mask the key
            body.secretKey = maskSensitiveData(decrypt(encryptedSecretKey));
            
            // For API calls we might need the actual key (stored in a non-returned property)
            body._decryptedSecretKey = decrypt(encryptedSecretKey);
          } catch (e) {
            console.error('Error decrypting Secret key:', e);
          }
        }
        
        // For arrays of objects with API keys
        if (Array.isArray(body)) {
          body.forEach(item => {
            if (item.apiKey && typeof item.apiKey === 'string' && item.apiKey.includes(':')) {
              try {
                const encryptedApiKey = item.apiKey;
                item.apiKey = maskSensitiveData(decrypt(encryptedApiKey));
                item._decryptedApiKey = decrypt(encryptedApiKey);
              } catch (e) {
                console.error('Error decrypting API key in array:', e);
              }
            }
            
            if (item.secretKey && typeof item.secretKey === 'string' && item.secretKey.includes(':')) {
              try {
                const encryptedSecretKey = item.secretKey;
                item.secretKey = maskSensitiveData(decrypt(encryptedSecretKey));
                item._decryptedSecretKey = decrypt(encryptedSecretKey);
              } catch (e) {
                console.error('Error decrypting Secret key in array:', e);
              }
            }
          });
        }
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  } catch (error) {
    console.error('API key decryption error:', error);
    next(error);
  }
}

/**
 * Helper function to get decrypted API keys for external API calls
 * @param encryptedApiKey The encrypted API key from database
 * @param encryptedSecretKey The encrypted secret key from database
 * @returns Object containing decrypted keys
 */
export function getDecryptedApiKeys(encryptedApiKey: string, encryptedSecretKey: string) {
  return {
    apiKey: decrypt(encryptedApiKey),
    secretKey: decrypt(encryptedSecretKey)
  };
}