package com.yesboss.autoreply

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
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
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
    val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
    Log.i(TAG, "PHONE_STATE = $stateStr")

    // A BroadcastReceiver is recreated per broadcast, so static state between the
    // RINGING and IDLE deliveries is unreliable (the process can be recycled in
    // between). Instead, on every transition to IDLE we look at the call log for
    // a just-now MISSED call. The latestMissedNumber() time window + the
    // per-number cooldown make this safe against false / duplicate replies.
    if (stateStr != TelephonyManager.EXTRA_STATE_IDLE) return

    // The call-log row for the missed call may land a beat after the IDLE
    // broadcast; give it a moment before reading.
    Thread.sleep(1500)
    onMissedCall(context)
    maybeStartRecap(context)
  }

  /**
   * If the just-ended call was an answered call with a saved contact, kick off
   * the background recap worker (which finds the recording, uploads it, and
   * texts the owner a summary). Saved-contact + answered only, de-duped per call.
   */
  private fun maybeStartRecap(context: Context) {
    val prefs = AutoReplyStore.prefs(context)
    if (!prefs.getBoolean(AutoReplyStore.KEY_RECAP_ENABLED, false)) return

    val number = prefs.getString(AutoReplyStore.KEY_RECAP_NUMBER, "") ?: ""
    val apiBase = prefs.getString(AutoReplyStore.KEY_API_BASE, "") ?: ""
    val token = prefs.getString(AutoReplyStore.KEY_DEVICE_TOKEN, "") ?: ""
    if (number.isBlank() || apiBase.isBlank() || token.isBlank()) {
      Log.i(TAG, "recap not fully configured — skipping")
      return
    }

    val call = latestCompletedCall(context) ?: return

    val dedupeKey = AutoReplyStore.recappedKey(call.number, call.occurredAtMs)
    if (prefs.getBoolean(dedupeKey, false)) {
      Log.i(TAG, "call already recapped — skipping")
      return
    }
    prefs.edit().putBoolean(dedupeKey, true).apply()

    Log.i(TAG, "starting recap for ${call.contactName}")
    val intent = Intent(context, RecapService::class.java).apply {
      putExtra("phoneNumber", call.number)
      putExtra("contactName", call.contactName)
      putExtra("direction", call.direction)
      putExtra("durationSec", call.durationSec)
      putExtra("occurredAtMs", call.occurredAtMs)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  private data class CompletedCall(
    val number: String,
    val contactName: String,
    val direction: String,
    val durationSec: Int,
    val occurredAtMs: Long,
  )

  /**
   * Newest answered call (incoming/outgoing, duration > 0) with a saved contact
   * name, within the last 2 minutes. Returns null for missed/rejected/unknown.
   */
  private fun latestCompletedCall(context: Context): CompletedCall? {
    return try {
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        arrayOf(
          CallLog.Calls.NUMBER,
          CallLog.Calls.CACHED_NAME,
          CallLog.Calls.TYPE,
          CallLog.Calls.DURATION,
          CallLog.Calls.DATE,
        ),
        null,
        null,
        "${CallLog.Calls.DATE} DESC LIMIT 1",
      ).use { c ->
        if (c == null || !c.moveToFirst()) return null
        val number = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
        val name = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME))
        val type = c.getInt(c.getColumnIndexOrThrow(CallLog.Calls.TYPE))
        val duration = c.getInt(c.getColumnIndexOrThrow(CallLog.Calls.DURATION))
        val date = c.getLong(c.getColumnIndexOrThrow(CallLog.Calls.DATE))

        val direction = when (type) {
          CallLog.Calls.INCOMING_TYPE -> "incoming"
          CallLog.Calls.OUTGOING_TYPE -> "outgoing"
          else -> return null // missed / rejected / voicemail — no recap
        }
        if (duration <= 0) return null // not actually answered
        if (name.isNullOrBlank()) return null // saved contacts only
        if (number.isNullOrBlank()) return null
        if (System.currentTimeMillis() - date > 120_000L) return null // stale

        CompletedCall(number, name, direction, duration, date)
      }
    } catch (e: Exception) {
      Log.e(TAG, "completed-call lookup failed: ${e.message}")
      null
    }
  }

  private fun onMissedCall(context: Context) {
    val prefs = AutoReplyStore.prefs(context)
    if (!prefs.getBoolean(AutoReplyStore.KEY_ENABLED, false)) {
      Log.i(TAG, "auto-reply disabled in prefs — skipping")
      return
    }

    val number = latestMissedNumber(context)
    if (number == null) {
      Log.i(TAG, "no recent missed call found")
      return
    }
    val cooldownMs =
      prefs.getInt(AutoReplyStore.KEY_COOLDOWN, 60).toLong() * 60_000L
    val lastReply = prefs.getLong(AutoReplyStore.lastReplyKey(number), 0L)
    if (System.currentTimeMillis() - lastReply < cooldownMs) {
      Log.i(TAG, "within cooldown for $number — skipping")
      return
    }

    val message = prefs.getString(AutoReplyStore.KEY_MESSAGE, "") ?: ""
    val signature = prefs.getString(AutoReplyStore.KEY_SIGNATURE, "") ?: ""
    val body = if (signature.isNotBlank()) "$message\n$signature" else message
    if (body.isBlank()) return

    try {
      // getSystemService(SmsManager) returns null below API 31 — use the
      // deprecated getDefault() on older Android (this device is API 29).
      val sms =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          context.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
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

  /**
   * Newest unanswered incoming call within the last 2 minutes (the one that just
   * happened). Counts both MISSED (rang out) and REJECTED — declining/cutting an
   * incoming call logs as REJECTED_TYPE on Android 7+, so we reply to those too.
   */
  private fun latestMissedNumber(context: Context): String? {
    return try {
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE),
        "${CallLog.Calls.TYPE} IN (?, ?)",
        arrayOf(
          CallLog.Calls.MISSED_TYPE.toString(),
          CallLog.Calls.REJECTED_TYPE.toString(),
        ),
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
