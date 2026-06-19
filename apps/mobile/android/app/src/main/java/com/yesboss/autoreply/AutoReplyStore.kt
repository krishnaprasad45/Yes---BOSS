package com.yesboss.autoreply

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

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

  // Recaps awaiting the owner's review/confirm (ask path) — JSON array of
  // {id, number, body, who}. The in-app review screen reads + edits these.
  private const val KEY_PENDING = "pending_recaps"

  fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Per-number throttle key so we don't spam the same caller. */
  fun lastReplyKey(number: String): String =
    "last_reply_${number.filter { it.isDigit() || it == '+' }}"

  /** Per-call de-dupe key so a given call is recapped at most once. */
  fun recappedKey(number: String, occurredAtMs: Long): String =
    "recapped_${number.filter { it.isDigit() || it == '+' }}_$occurredAtMs"

  // --- Pending-recap queue (ask path) --------------------------------------

  /** Queue a recap awaiting review; returns its id. */
  fun addPending(context: Context, number: String, body: String, who: String): String {
    val arr = pendingArray(context)
    val id = "r${System.currentTimeMillis()}"
    arr.put(
      JSONObject()
        .put("id", id)
        .put("number", number)
        .put("body", body)
        .put("who", who),
    )
    prefs(context).edit().putString(KEY_PENDING, arr.toString()).apply()
    return id
  }

  fun pendingArray(context: Context): JSONArray =
    try {
      JSONArray(prefs(context).getString(KEY_PENDING, "[]") ?: "[]")
    } catch (e: Exception) {
      JSONArray()
    }

  fun getPending(context: Context, id: String): JSONObject? {
    val arr = pendingArray(context)
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      if (o.optString("id") == id) return o
    }
    return null
  }

  fun removePending(context: Context, id: String) {
    val arr = pendingArray(context)
    val next = JSONArray()
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      if (o.optString("id") != id) next.put(o)
    }
    prefs(context).edit().putString(KEY_PENDING, next.toString()).apply()
  }
}
