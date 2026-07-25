// vaultCrypto — one-way hashing for the private-journal vault's PIN and
// security-question answers.
//
// These used to be stored and compared as plaintext (including a hardcoded
// '1234' default PIN), which meant anyone with read access to the `vaults`
// Firestore doc — a data breach, a misconfigured rule, insider access — saw
// the actual PIN and recovery answers directly. Hashing doesn't make a
// 4-digit PIN brute-force-proof (that's what attempt lockout is for — see
// PrivateVaultScreen/ForgotPINScreen), but it does mean a raw data leak no
// longer hands over the literal secret, and it stops the same value from
// being reused verbatim as a lookup key.
//
// Uses expo-crypto (already a dependency) so this works the same in Expo Go
// and dev-client builds without adding a new native module.
import * as Crypto from 'expo-crypto';

// Static app-level pepper mixed into every digest. Not a secret in the
// "protects the hash" sense (it ships in the app bundle) — its purpose is
// just to namespace these hashes so a PIN hash and an identically-valued
// answer hash never collide, and so the hash can't be looked up against
// generic "sha256(value)" rainbow tables.
const PEPPER = 'supergirl-vault-v1';

export type VaultSecretKind = 'pin' | 'answer';

/** Hashes a vault secret (PIN digits or a security-question answer).
 *  Normalizes answers (lowercase/trim) the same way the old plaintext
 *  comparison did, so existing stored hashes keep matching. */
export async function hashVaultSecret(kind: VaultSecretKind, value: string): Promise<string> {
  const normalized = kind === 'answer' ? value.trim().toLowerCase() : value;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PEPPER}:${kind}:${normalized}`,
  );
}

/** Hashes a candidate value and compares it to a stored hash. */
export async function verifyVaultSecret(
  kind: VaultSecretKind,
  candidate: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return false;
  const candidateHash = await hashVaultSecret(kind, candidate);
  return candidateHash === storedHash;
}
