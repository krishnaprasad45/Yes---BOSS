package com.yesboss.autoreply

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

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
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUTO_REPLY_CONFIG_ERROR", e.message, e)
    }
  }
}
