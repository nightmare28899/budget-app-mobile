package com.budgetapp.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class BudgetAppSecureKeyStoreModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = MODULE_NAME

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getOrCreateMMKVKey(): String {
    val existingKey = readStoredKey()
    if (existingKey != null) {
      return existingKey
    }

    val generatedKey = generateMmkvKey()
    storeKey(generatedKey)
    return generatedKey
  }

  private fun readStoredKey(): String? {
    val ciphertext = preferences.getString(CIPHERTEXT_KEY, null) ?: return null
    val iv = preferences.getString(IV_KEY, null) ?: return null

    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(
      Cipher.DECRYPT_MODE,
      getOrCreateSecretKey(),
      GCMParameterSpec(GCM_TAG_LENGTH_BITS, Base64.decode(iv, Base64.NO_WRAP)),
    )

    val plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP))
    return plaintext.toString(Charsets.UTF_8)
  }

  private fun storeKey(value: String) {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())

    val ciphertext = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    preferences
      .edit()
      .putString(
        CIPHERTEXT_KEY,
        Base64.encodeToString(ciphertext, Base64.NO_WRAP),
      )
      .putString(
        IV_KEY,
        Base64.encodeToString(cipher.iv, Base64.NO_WRAP),
      )
      .apply()
  }

  private fun getOrCreateSecretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
      load(null)
    }

    val existingKey = keyStore.getKey(KEY_ALIAS, null)
    if (existingKey is SecretKey) {
      return existingKey
    }

    val keyGenerator = KeyGenerator.getInstance(
      KeyProperties.KEY_ALGORITHM_AES,
      ANDROID_KEYSTORE,
    )
    keyGenerator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build(),
    )

    return keyGenerator.generateKey()
  }

  private fun generateMmkvKey(): String {
    val raw = ByteArray(MMKV_KEY_RANDOM_BYTES)
    SecureRandom().nextBytes(raw)
    return Base64.encodeToString(
      raw,
      Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
    ).take(MMKV_KEY_LENGTH)
  }

  private val preferences by lazy {
    reactApplicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
  }

  companion object {
    private const val MODULE_NAME = "BudgetAppSecureKeyStore"
    private const val PREFERENCES_NAME = "budgetapp_secure_keystore"
    private const val KEY_ALIAS = "budgetapp_mmkv_storage_key_v2"
    private const val CIPHERTEXT_KEY = "ciphertext"
    private const val IV_KEY = "iv"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val MMKV_KEY_LENGTH = 16
    private const val MMKV_KEY_RANDOM_BYTES = 12
  }
}
