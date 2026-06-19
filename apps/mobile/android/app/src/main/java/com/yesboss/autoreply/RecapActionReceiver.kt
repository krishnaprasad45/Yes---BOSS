package com.yesboss.autoreply

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import android.util.Log
import com.yesboss.MainActivity

/**
 * Backs the "ask before sending" recap flow (Smart / Always-ask modes): shows a
 * notification with Send / Discard buttons and, on tap, either texts the recap
 * to the owner or dismisses it — all without opening the app.
 */
class RecapActionReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "RecapAction"
    private const val CHANNEL_ID = "recap_confirm"
    private const val ACTION_SEND = "com.yesboss.RECAP_SEND"
    private const val ACTION_DISCARD = "com.yesboss.RECAP_DISCARD"
    private const val EXTRA_ID = "recapId"
    private const val EXTRA_NOTIF_ID = "notifId"

    /** Notification id is derived from the recap id so actions can cancel it. */
    private fun notifIdFor(id: String): Int = id.hashCode() and 0x7fffffff

    /**
     * Queue a recap for review and post a notification with Send / Discard plus
     * a tap target that opens the in-app editable preview.
     */
    fun showConfirm(context: Context, number: String, smsBody: String, who: String) {
      val id = AutoReplyStore.addPending(context, number, smsBody, who)
      val notifId = notifIdFor(id)

      val mgr = context.getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        mgr.createNotificationChannel(
          NotificationChannel(
            CHANNEL_ID,
            "Recap confirmations",
            NotificationManager.IMPORTANCE_HIGH,
          ),
        )
      }

      fun piFlags(): Int {
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        return flags
      }

      fun action(which: String, req: Int): PendingIntent {
        val intent = Intent(context, RecapActionReceiver::class.java).apply {
          action = which
          putExtra(EXTRA_ID, id)
          putExtra(EXTRA_NOTIF_ID, notifId)
        }
        return PendingIntent.getBroadcast(context, req, intent, piFlags())
      }

      // Tap the body → open the app to review/edit before sending.
      val open = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtra("openRecapReview", true)
      }
      val contentPi = PendingIntent.getActivity(context, notifId, open, piFlags())

      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }
      val notif = builder
        .setContentTitle("Call recap ready — $who")
        .setContentText(smsBody)
        .setStyle(Notification.BigTextStyle().bigText("$smsBody\n\nTap to edit before sending."))
        .setSmallIcon(android.R.drawable.ic_menu_send)
        .setAutoCancel(true)
        .setContentIntent(contentPi)
        .addAction(android.R.drawable.ic_menu_send, "Send", action(ACTION_SEND, notifId * 2))
        .addAction(
          android.R.drawable.ic_menu_close_clear_cancel,
          "Discard",
          action(ACTION_DISCARD, notifId * 2 + 1),
        )
        .build()

      mgr.notify(notifId, notif)
    }

    /** Send a (possibly edited) recap to its number and clear it from the queue. */
    fun sendPending(context: Context, id: String, body: String): Boolean {
      val pending = AutoReplyStore.getPending(context, id) ?: return false
      val number = pending.optString("number")
      AutoReplyStore.removePending(context, id)
      context.getSystemService(NotificationManager::class.java).cancel(notifIdFor(id))
      if (number.isBlank() || body.isBlank()) return false
      return sendSms(context, number, body)
    }

    fun discardPending(context: Context, id: String) {
      AutoReplyStore.removePending(context, id)
      context.getSystemService(NotificationManager::class.java).cancel(notifIdFor(id))
    }

    private fun sendSms(context: Context, number: String, body: String): Boolean {
      return try {
        val sms =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
          } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
          }
        val parts = sms.divideMessage(body)
        sms.sendMultipartTextMessage(number, null, parts, null, null)
        true
      } catch (e: Exception) {
        Log.e(TAG, "recap send failed: ${e.message}")
        false
      }
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    if (intent.action == ACTION_SEND) {
      // Notification quick-send uses the original (unedited) body.
      val pending = AutoReplyStore.getPending(context, id)
      val body = pending?.optString("body") ?: ""
      sendPending(context, id, body)
      Log.i(TAG, "recap sent on confirm")
    } else {
      discardPending(context, id)
      Log.i(TAG, "recap discarded")
    }
  }
}
