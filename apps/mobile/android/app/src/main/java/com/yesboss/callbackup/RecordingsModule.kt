package com.yesboss.callbackup

import android.content.ContentUris
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

/**
 * Lists call-recording audio files via MediaStore. Samsung (and most OEMs)
 * drop call recordings under a "Call" folder; we surface every audio file whose
 * path looks like a call recording and return a content:// uri the JS layer can
 * hand straight to FormData for upload (no base64, no manual file reads).
 */
class RecordingsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "RecordingsReader"

  @ReactMethod
  fun listRecordings(afterMs: Double, limit: Double, promise: Promise) {
    try {
      val result: WritableArray = Arguments.createArray()
      val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      val projection = arrayOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.DISPLAY_NAME,
        MediaStore.Audio.Media.RELATIVE_PATH,
        MediaStore.Audio.Media.SIZE,
        MediaStore.Audio.Media.DATE_MODIFIED,
      )
      // RELATIVE_PATH / DATA both carry the folder; match common recording dirs.
      val selection =
        "(${MediaStore.Audio.Media.RELATIVE_PATH} LIKE '%Call%' OR " +
          "${MediaStore.Audio.Media.RELATIVE_PATH} LIKE '%Recordings%')" +
          if (afterMs > 0) " AND ${MediaStore.Audio.Media.DATE_MODIFIED} > ?" else ""
      val selectionArgs =
        if (afterMs > 0) arrayOf((afterMs.toLong() / 1000).toString()) else null
      val sortOrder =
        "${MediaStore.Audio.Media.DATE_MODIFIED} DESC LIMIT ${limit.toLong()}"

      reactApplicationContext.contentResolver.query(
        collection, projection, selection, selectionArgs, sortOrder,
      ).use { cursor ->
        if (cursor == null) {
          promise.resolve(result)
          return
        }
        val idIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val nameIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
        val sizeIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
        val dateIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
        while (cursor.moveToNext()) {
          val id = cursor.getLong(idIdx)
          val uri = ContentUris.withAppendedId(collection, id)
          val row = Arguments.createMap()
          row.putString("uri", uri.toString())
          row.putString("name", cursor.getString(nameIdx) ?: "")
          row.putDouble("sizeBytes", cursor.getLong(sizeIdx).toDouble())
          // DATE_MODIFIED is epoch seconds; normalize to ms for JS.
          row.putDouble("modifiedAtMs", cursor.getLong(dateIdx).toDouble() * 1000.0)
          result.pushMap(row)
        }
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("RECORDINGS_ERROR", e.message, e)
    }
  }
}
