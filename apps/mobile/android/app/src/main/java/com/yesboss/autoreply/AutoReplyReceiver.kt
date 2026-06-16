package com.yesboss.autoreply

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.CallLog
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.util.Log

/**
 * Detects missed calls and texts the caller a configurable auto-reply.
 *
 * Modern Android won't hand us the incoming number in PHONE_STATE, so on the
 * ring→idle transition (no off-hook in between = missed) we read the most
 * recent MISSED entry from the call log and reply to that number. Config and
 * per-number cooldown live in SharedPreferences, written by AutoReplyModule
 * whenever the app syncs the backend settings.
 */
class AutoReplyReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "AutoReplyReceiver"
    private var lastState = TelephonyManager.CALL_STATE_IDLE
    private var wasRinging = false
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
    val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
    val state = when (stateStr) {
      TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
      TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
      else -> TelephonyManager.CALL_STATE_IDLE
    }
    if (state == lastState) return

    when (state) {
      TelephonyManager.CALL_STATE_RINGING -> wasRinging = true
      TelephonyManager.CALL_STATE_OFFHOOK -> wasRinging = false // answered, not missed
      TelephonyManager.CALL_STATE_IDLE -> {
        if (wasRinging) onMissedCall(context)
        wasRinging = false
      }
    }
    lastState = state
  }

  private fun onMissedCall(context: Context) {
    val prefs = AutoReplyStore.prefs(context)
    if (!prefs.getBoolean(AutoReplyStore.KEY_ENABLED, false)) return

    val number = latestMissedNumber(context) ?: return
    val cooldownMs =
      prefs.getInt(AutoReplyStore.KEY_COOLDOWN, 60).toLong() * 60_000L
    val lastReply = prefs.getLong(AutoReplyStore.lastReplyKey(number), 0L)
    if (System.currentTimeMillis() - lastReply < cooldownMs) return

    val message = prefs.getString(AutoReplyStore.KEY_MESSAGE, "") ?: ""
    val signature = prefs.getString(AutoReplyStore.KEY_SIGNATURE, "") ?: ""
    val body = if (signature.isNotBlank()) "$message\n$signature" else message
    if (body.isBlank()) return

    try {
      val sms = context.getSystemService(SmsManager::class.java)
      val parts = sms.divideMessage(body)
      sms.sendMultipartTextMessage(number, null, parts, null, null)
      prefs.edit()
        .putLong(AutoReplyStore.lastReplyKey(number), System.currentTimeMillis())
        .apply()
      Log.i(TAG, "Auto-replied to $number")
    } catch (e: Exception) {
      Log.e(TAG, "Auto-reply send failed: ${e.message}")
    }
  }

  /** Newest MISSED call within the last 2 minutes (the one that just happened). */
  private fun latestMissedNumber(context: Context): String? {
    return try {
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE),
        "${CallLog.Calls.TYPE} = ?",
        arrayOf(CallLog.Calls.MISSED_TYPE.toString()),
        "${CallLog.Calls.DATE} DESC LIMIT 1",
      ).use { c ->
        if (c == null || !c.moveToFirst()) return null
        val number = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
        val date = c.getLong(c.getColumnIndexOrThrow(CallLog.Calls.DATE))
        if (System.currentTimeMillis() - date > 120_000L) null
        else number?.takeIf { it.isNotBlank() }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Missed-number lookup failed: ${e.message}")
      null
    }
  }
}
