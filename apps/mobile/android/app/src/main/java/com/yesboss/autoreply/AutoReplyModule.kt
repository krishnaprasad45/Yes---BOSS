package com.yesboss.autoreply

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray

/**
 * Bridge for the JS layer to push the backend auto-reply config down to the
 * SharedPreferences the AutoReplyReceiver reads at call time.
 */
class AutoReplyModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AutoReply"

  @ReactMethod
  fun setConfig(config: ReadableMap, promise: Promise) {
    try {
      val prefs = AutoReplyStore.prefs(reactApplicationContext)
      prefs.edit()
        .putBoolean(
          AutoReplyStore.KEY_ENABLED,
          if (config.hasKey("enabled")) config.getBoolean("enabled") else false,
        )
        .putString(
          AutoReplyStore.KEY_MESSAGE,
          if (config.hasKey("message")) config.getString("message") else "",
        )
        .putString(
          AutoReplyStore.KEY_SIGNATURE,
          if (config.hasKey("signature")) config.getString("signature") else "",
        )
        .putInt(
          AutoReplyStore.KEY_COOLDOWN,
          if (config.hasKey("cooldownMinutes")) config.getInt("cooldownMinutes") else 60,
        )
        .putBoolean(
          AutoReplyStore.KEY_RECAP_ENABLED,
          if (config.hasKey("recapEnabled")) config.getBoolean("recapEnabled") else false,
        )
        .putString(
          AutoReplyStore.KEY_RECAP_NUMBER,
          if (config.hasKey("recapNumber")) config.getString("recapNumber") else "",
        )
        .putString(
          AutoReplyStore.KEY_RECAP_MODE,
          if (config.hasKey("recapMode")) config.getString("recapMode") else "smart",
        )
        .putBoolean(
          AutoReplyStore.KEY_CALLER_SUMMARY,
          if (config.hasKey("callerSummaryEnabled")) config.getBoolean("callerSummaryEnabled") else false,
        )
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUTO_REPLY_CONFIG_ERROR", e.message, e)
    }
  }

  /**
   * Stores the API base URL + long-lived device token the background recap
   * worker needs to reach the backend while the app is closed.
   */
  @ReactMethod
  fun setRecapAuth(apiBaseUrl: String, deviceToken: String, promise: Promise) {
    try {
      AutoReplyStore.prefs(reactApplicationContext).edit()
        .putString(AutoReplyStore.KEY_API_BASE, apiBaseUrl)
        .putString(AutoReplyStore.KEY_DEVICE_TOKEN, deviceToken)
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("RECAP_AUTH_ERROR", e.message, e)
    }
  }

  /** Recaps awaiting the owner's review (ask path). */
  @ReactMethod
  fun getPendingRecaps(promise: Promise) {
    try {
      val arr = AutoReplyStore.pendingArray(reactApplicationContext)
      val out: WritableArray = Arguments.createArray()
      for (i in 0 until arr.length()) {
        val o = arr.optJSONObject(i) ?: continue
        val map = Arguments.createMap()
        map.putString("id", o.optString("id"))
        map.putString("number", o.optString("number"))
        map.putString("body", o.optString("body"))
        map.putString("who", o.optString("who"))
        out.pushMap(map)
      }
      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("PENDING_RECAPS_ERROR", e.message, e)
    }
  }

  /** Send a reviewed/edited recap and clear it from the queue. */
  @ReactMethod
  fun sendRecap(id: String, body: String, promise: Promise) {
    try {
      val ok = RecapActionReceiver.sendPending(reactApplicationContext, id, body)
      promise.resolve(ok)
    } catch (e: Exception) {
      promise.reject("SEND_RECAP_ERROR", e.message, e)
    }
  }

  /** Drop a pending recap without sending. */
  @ReactMethod
  fun discardRecap(id: String, promise: Promise) {
    try {
      RecapActionReceiver.discardPending(reactApplicationContext, id)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("DISCARD_RECAP_ERROR", e.message, e)
    }
  }
}
