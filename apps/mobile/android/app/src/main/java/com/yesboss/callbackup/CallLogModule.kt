package com.yesboss.callbackup

import android.provider.CallLog
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

/**
 * Reads the device call log. The CACHED_NAME column already carries the
 * resolved contact name, so no separate READ_CONTACTS permission is needed.
 */
class CallLogModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "CallLogReader"

  @ReactMethod
  fun readCallLog(afterMs: Double, limit: Double, promise: Promise) {
    try {
      val result: WritableArray = Arguments.createArray()
      val projection = arrayOf(
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DURATION,
        CallLog.Calls.DATE,
      )
      val selection = if (afterMs > 0) "${CallLog.Calls.DATE} > ?" else null
      val selectionArgs =
        if (afterMs > 0) arrayOf(afterMs.toLong().toString()) else null
      val sortOrder = "${CallLog.Calls.DATE} DESC LIMIT ${limit.toLong()}"

      reactApplicationContext.contentResolver.query(
        CallLog.Calls.CONTENT_URI, projection, selection, selectionArgs, sortOrder,
      ).use { cursor ->
        if (cursor == null) {
          promise.resolve(result)
          return
        }
        val numberIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
        val nameIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
        val typeIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
        val durationIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)
        val dateIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
        while (cursor.moveToNext()) {
          val row = Arguments.createMap()
          row.putString("phoneNumber", cursor.getString(numberIdx) ?: "")
          val name = cursor.getString(nameIdx)
          if (name != null) row.putString("contactName", name) else row.putNull("contactName")
          row.putString("direction", directionOf(cursor.getInt(typeIdx)))
          row.putInt("durationSec", cursor.getInt(durationIdx))
          row.putDouble("occurredAtMs", cursor.getLong(dateIdx).toDouble())
          result.pushMap(row)
        }
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("CALL_LOG_ERROR", e.message, e)
    }
  }

  private fun directionOf(type: Int): String = when (type) {
    CallLog.Calls.INCOMING_TYPE -> "incoming"
    CallLog.Calls.OUTGOING_TYPE -> "outgoing"
    CallLog.Calls.MISSED_TYPE -> "missed"
    CallLog.Calls.REJECTED_TYPE -> "rejected"
    else -> "incoming"
  }
}
