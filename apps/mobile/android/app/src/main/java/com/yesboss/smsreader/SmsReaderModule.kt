package com.yesboss.smsreader

import android.provider.Telephony
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

/**
 * Reads the device SMS inbox. Parsing into transactions happens in JS
 * (src/services/smsParsers) — this module only ferries raw rows across.
 */
class SmsReaderModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SmsReader"

  /**
   * @param afterMs only return messages received strictly after this epoch-ms
   *   (0 = whole inbox). Lets the app do incremental syncs.
   * @param limit   hard cap on rows returned (newest first).
   */
  @ReactMethod
  fun readInbox(afterMs: Double, limit: Double, promise: Promise) {
    try {
      val result: WritableArray = Arguments.createArray()
      val uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE,
      )
      val selection = if (afterMs > 0) "${Telephony.Sms.DATE} > ?" else null
      val selectionArgs =
        if (afterMs > 0) arrayOf(afterMs.toLong().toString()) else null
      val sortOrder = "${Telephony.Sms.DATE} DESC LIMIT ${limit.toLong()}"

      reactApplicationContext.contentResolver.query(
        uri, projection, selection, selectionArgs, sortOrder,
      ).use { cursor ->
        if (cursor == null) {
          promise.resolve(result)
          return
        }
        val addressIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (cursor.moveToNext()) {
          val row = Arguments.createMap()
          row.putString("sender", cursor.getString(addressIdx) ?: "")
          row.putString("body", cursor.getString(bodyIdx) ?: "")
          // JS numbers are doubles; epoch-ms fits exactly under 2^53.
          row.putDouble("receivedAtMs", cursor.getLong(dateIdx).toDouble())
          result.pushMap(row)
        }
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("SMS_READ_ERROR", e.message, e)
    }
  }
}
