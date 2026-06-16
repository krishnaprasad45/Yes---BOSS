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

  fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Per-number throttle key so we don't spam the same caller. */
  fun lastReplyKey(number: String): String =
    "last_reply_${number.filter { it.isDigit() || it == '+' }}"
}
