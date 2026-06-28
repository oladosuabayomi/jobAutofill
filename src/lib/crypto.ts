// Helper functions to encrypt/decrypt passwords before sending to Supabase
// The master key is stored securely in chrome.storage.local

export const encryptPassword = async (password: string, masterKey: string): Promise<string> => {
  if (!masterKey) throw new Error("Master encryption key is required")

  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(masterKey), { name: 'PBKDF2' }, false, ['deriveKey']
  )
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(password))
  
  const payload = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  payload.set(salt, 0)
  payload.set(iv, salt.length)
  payload.set(new Uint8Array(encrypted), salt.length + iv.length)
  return btoa(String.fromCharCode(...payload))
}

export const decryptPassword = async (encryptedData: string, masterKey: string): Promise<string> => {
  if (!masterKey) throw new Error("Master encryption key is required")

  const payload = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
  const salt = payload.slice(0, 16)
  const iv = payload.slice(16, 28)
  const encrypted = payload.slice(28)
  
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(masterKey), { name: 'PBKDF2' }, false, ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}
