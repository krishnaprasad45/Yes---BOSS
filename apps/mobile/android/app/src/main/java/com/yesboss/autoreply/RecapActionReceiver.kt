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
    private const val EXTRA_BODY = "smsBody"
    private const val EXTRA_NUMBER = "number"
    private const val EXTRA_NOTIF_ID = "notifId"

    /** Post a recap awaiting the owner's confirm, with Send / Discard actions. */
    fun showConfirm(context: Context, number: String, smsBody: String, who: String) {
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

      val notifId = (System.currentTimeMillis() % 100_000).toInt()

      fun action(which: String): PendingIntent {
        val intent = Intent(context, RecapActionReceiver::class.java).apply {
          action = which
          putExtra(EXTRA_BODY, smsBody)
          putExtra(EXTRA_NUMBER, number)
          putExtra(EXTRA_NOTIF_ID, notifId)
        }
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        // Distinct request codes so Send / Discard don't collide.
        val req = notifId * 2 + if (which == ACTION_SEND) 0 else 1
        return PendingIntent.getBroadcast(context, req, intent, flags)
      }

      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }
      val notif = builder
        .setContentTitle("Call recap ready — $who")
        .setContentText(smsBody)
        .setStyle(Notification.BigTextStyle().bigText(smsBody))
        .setSmallIcon(android.R.drawable.ic_menu_send)
        .setAutoCancel(true)
        .addAction(android.R.drawable.ic_menu_send, "Send", action(ACTION_SEND))
        .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Discard", action(ACTION_DISCARD))
        .build()

      mgr.notify(notifId, notif)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    val notifId = intent.getIntExtra(EXTRA_NOTIF_ID, 0)
    context.getSystemService(NotificationManager::class.java).cancel(notifId)

    if (intent.action != ACTION_SEND) {
      Log.i(TAG, "recap discarded")
      return
    }

    val body = intent.getStringExtra(EXTRA_BODY) ?: return
    val number = intent.getStringExtra(EXTRA_NUMBER) ?: return
    try {
      val sms =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          context.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
      val parts = sms.divideMessage(body)
      sms.sendMultipartTextMessage(number, null, parts, null, null)
      Log.i(TAG, "recap sent on confirm")
    } catch (e: Exception) {
      Log.e(TAG, "confirm send failed: ${e.message}")
    }
  }
}
