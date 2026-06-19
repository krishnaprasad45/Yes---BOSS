package com.yesboss.autoreply

import android.content.Context
import android.content.SharedPreferences

/** Single source of truth for the auto-reply config the receiver reads. */
object AutoReplyStore {
  private const val PREFS = "auto_reply"
  const val KEY_ENABLED = "enabled"
  const val KEY_MESSAGE = "message"
  const val KEY_SIGNATURE = "signature"
  const val KEY_COOLDOWN = "cooldown_minutes"

  // Auto post-call recap (self-recap SMS).
  const val KEY_RECAP_ENABLED = "recap_enabled"
  const val KEY_RECAP_NUMBER = "recap_number"
  const val KEY_RECAP_MODE = "recap_mode" // smart | always_send | always_ask
  const val KEY_API_BASE = "api_base_url"
  const val KEY_DEVICE_TOKEN = "device_token"

  fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Per-number throttle key so we don't spam the same caller. */
  fun lastReplyKey(number: String): String =
    "last_reply_${number.filter { it.isDigit() || it == '+' }}"

  /** Per-call de-dupe key so a given call is recapped at most once. */
  fun recappedKey(number: String, occurredAtMs: Long): String =
    "recapped_${number.filter { it.isDigit() || it == '+' }}_$occurredAtMs"
}
