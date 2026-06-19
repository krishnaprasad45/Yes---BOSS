package com.yesboss.autoreply

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.MediaStore
import android.telephony.SmsManager
import android.util.Log
import org.json.JSONObject
import java.io.DataOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Short-lived foreground service that runs the post-call recap in the
 * background: finds the just-recorded call audio, uploads it to the backend
 * (which transcribes + summarizes), then texts the owner the returned recap.
 *
 * Runs as a foreground service so the OS doesn't kill the process mid-upload
 * (the work outlives a BroadcastReceiver). Saved-contact gating + de-dupe are
 * already done by AutoReplyReceiver before we get here.
 */
class RecapService : Service() {

  companion object {
    private const val TAG = "RecapService"
    private const val CHANNEL_ID = "recap"
    private const val NOTIF_ID = 4711
    // Samsung writes the recording file a few seconds after the call ends.
    private const val FIND_TIMEOUT_MS = 20_000L
    private const val FIND_INTERVAL_MS = 2_000L
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification())
    if (intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    val number = intent.getStringExtra("phoneNumber") ?: ""
    val contactName = intent.getStringExtra("contactName") ?: ""
    val direction = intent.getStringExtra("direction") ?: "incoming"
    val durationSec = intent.getIntExtra("durationSec", 0)
    val occurredAtMs = intent.getLongExtra("occurredAtMs", 0L)

    Thread {
      try {
        run(number, contactName, direction, durationSec, occurredAtMs)
      } catch (e: Exception) {
        Log.e(TAG, "recap worker failed: ${e.message}", e)
      } finally {
        stopForegroundCompat()
        stopSelf()
      }
    }.start()

    return START_NOT_STICKY
  }

  private fun run(
    number: String,
    contactName: String,
    direction: String,
    durationSec: Int,
    occurredAtMs: Long,
  ) {
    val prefs = AutoReplyStore.prefs(this)
    val apiBase = prefs.getString(AutoReplyStore.KEY_API_BASE, "") ?: ""
    val token = prefs.getString(AutoReplyStore.KEY_DEVICE_TOKEN, "") ?: ""
    val recapNumber = prefs.getString(AutoReplyStore.KEY_RECAP_NUMBER, "") ?: ""
    if (apiBase.isBlank() || token.isBlank() || recapNumber.isBlank()) return

    val recording = findRecording(occurredAtMs)
    if (recording == null) {
      Log.i(TAG, "no recording found for call — skipping recap")
      return
    }

    val audio = contentResolver.openInputStream(recording.uri)?.use { it.readBytes() }
    if (audio == null || audio.isEmpty()) {
      Log.i(TAG, "recording was empty — skipping")
      return
    }

    val smsBody = uploadAndGetRecap(
      apiBase, token, number, contactName, direction, durationSec, occurredAtMs,
      recording.name, audio,
    ) ?: return

    sendSms(recapNumber, smsBody)
    Log.i(TAG, "recap SMS sent to self")
  }

  private data class Recording(val uri: Uri, val name: String, val modifiedMs: Long)

  /** Newest call-recording audio file written at/after the call start. */
  private fun findRecording(occurredAtMs: Long): Recording? {
    val deadline = System.currentTimeMillis() + FIND_TIMEOUT_MS
    // Allow a small skew before the call-log timestamp.
    val afterSec = (occurredAtMs / 1000) - 10
    while (System.currentTimeMillis() < deadline) {
      val found = queryNewestRecording(afterSec)
      if (found != null) return found
      Thread.sleep(FIND_INTERVAL_MS)
    }
    return null
  }

  private fun queryNewestRecording(afterSec: Long): Recording? {
    val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.DISPLAY_NAME,
      MediaStore.Audio.Media.DATE_MODIFIED,
    )
    val selection =
      "(${MediaStore.Audio.Media.RELATIVE_PATH} LIKE '%Call%' OR " +
        "${MediaStore.Audio.Media.RELATIVE_PATH} LIKE '%Recordings%') AND " +
        "${MediaStore.Audio.Media.DATE_MODIFIED} >= ?"
    val args = arrayOf(afterSec.toString())
    val sort = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC LIMIT 1"

    contentResolver.query(collection, projection, selection, args, sort).use { c ->
      if (c == null || !c.moveToFirst()) return null
      val id = c.getLong(c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID))
      val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)) ?: "recording.m4a"
      val modified = c.getLong(c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)) * 1000
      val uri = android.content.ContentUris.withAppendedId(collection, id)
      return Recording(uri, name, modified)
    }
  }

  /** Multipart upload to /calls/auto-recap; returns the SMS body or null. */
  private fun uploadAndGetRecap(
    apiBase: String,
    token: String,
    number: String,
    contactName: String,
    direction: String,
    durationSec: Int,
    occurredAtMs: Long,
    fileName: String,
    audio: ByteArray,
  ): String? {
    val boundary = "----yesboss${System.currentTimeMillis()}"
    val url = URL("${apiBase.trimEnd('/')}/calls/auto-recap")
    val conn = url.openConnection() as HttpURLConnection
    try {
      conn.requestMethod = "POST"
      conn.doOutput = true
      conn.connectTimeout = 15_000
      conn.readTimeout = 60_000
      conn.setRequestProperty("Authorization", "Bearer $token")
      conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")

      DataOutputStream(conn.outputStream).use { out ->
        fun field(name: String, value: String) {
          out.writeBytes("--$boundary\r\n")
          out.writeBytes("Content-Disposition: form-data; name=\"$name\"\r\n\r\n")
          out.writeBytes(value)
          out.writeBytes("\r\n")
        }
        field("phoneNumber", number)
        field("contactName", contactName)
        field("direction", direction)
        field("durationSec", durationSec.toString())
        field("occurredAt", toIso(occurredAtMs))
        field("sourceFileName", fileName)

        out.writeBytes("--$boundary\r\n")
        out.writeBytes(
          "Content-Disposition: form-data; name=\"file\"; filename=\"$fileName\"\r\n",
        )
        out.writeBytes("Content-Type: audio/mpeg\r\n\r\n")
        out.write(audio)
        out.writeBytes("\r\n")
        out.writeBytes("--$boundary--\r\n")
      }

      val code = conn.responseCode
      val stream = if (code in 200..299) conn.inputStream else conn.errorStream
      val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
      if (code !in 200..299) {
        Log.e(TAG, "auto-recap failed ($code): ${text.take(200)}")
        return null
      }
      // Envelope: { data: { smsBody }, ... }
      val data = JSONObject(text).optJSONObject("data") ?: return null
      return data.optString("smsBody").ifBlank { null }
    } finally {
      conn.disconnect()
    }
  }

  private fun sendSms(to: String, body: String) {
    val sms =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
    val parts = sms.divideMessage(body)
    sms.sendMultipartTextMessage(to, null, parts, null, null)
  }

  private fun toIso(ms: Long): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date(ms))
  }

  private fun buildNotification(): Notification {
    val mgr = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Call recap",
        NotificationManager.IMPORTANCE_LOW,
      )
      mgr.createNotificationChannel(channel)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setContentTitle("Generating call recap…")
      .setContentText("Summarizing your last call")
      .setSmallIcon(android.R.drawable.ic_menu_recent_history)
      .setOngoing(true)
      .build()
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }
}
