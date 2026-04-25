package com.inframanager.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM encryption utility for sensitive data such as SSH passwords.
 */
public final class EncryptionUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private EncryptionUtil() {
        // utility class
    }

    /**
     * Encrypts plainText using AES-256-GCM with the given master key.
     *
     * @param plainText the text to encrypt
     * @param masterKey the master key (will be hashed to 256 bits)
     * @return Base64-encoded ciphertext (IV prepended)
     */
    public static String encrypt(String plainText, String masterKey) {
        try {
            byte[] keyBytes = deriveKey(masterKey);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGORITHM);

            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypts Base64-encoded ciphertext using AES-256-GCM with the given master key.
     *
     * @param encrypted the Base64-encoded ciphertext (IV prepended)
     * @param masterKey the master key (will be hashed to 256 bits)
     * @return the decrypted plain text
     */
    public static String decrypt(String encrypted, String masterKey) {
        try {
            byte[] decoded = Base64.getDecoder().decode(encrypted);
            byte[] keyBytes = deriveKey(masterKey);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGORITHM);

            byte[] iv = Arrays.copyOfRange(decoded, 0, GCM_IV_LENGTH);
            byte[] cipherText = Arrays.copyOfRange(decoded, GCM_IV_LENGTH, decoded.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

            byte[] decrypted = cipher.doFinal(cipherText);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }

    /**
     * Derives a 256-bit key from the master key string using SHA-256.
     */
    private static byte[] deriveKey(String masterKey) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return digest.digest(masterKey.getBytes(StandardCharsets.UTF_8));
    }
}
