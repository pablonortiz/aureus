package com.aureus

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class MediaStoreDeleteModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var deletePromise: Promise? = null

    companion object {
        const val DELETE_REQUEST_CODE = 9001
    }

    init {
        reactContext.addActivityEventListener(object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                if (requestCode == DELETE_REQUEST_CODE) {
                    deletePromise?.resolve(resultCode == Activity.RESULT_OK)
                    deletePromise = null
                }
            }
        })
    }

    override fun getName(): String = "MediaStoreDelete"

    @ReactMethod
    fun deleteUris(uriStrings: ReadableArray, promise: Promise) {
        try {
            val uris = mutableListOf<Uri>()
            for (i in 0 until uriStrings.size()) {
                uris.add(Uri.parse(uriStrings.getString(i)))
            }

            if (uris.isEmpty()) {
                promise.resolve(true)
                return
            }

            val resolver = reactApplicationContext.contentResolver

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11+: use createDeleteRequest (shows system dialog)
                val activity = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.resolve(false)
                    return
                }
                deletePromise = promise
                val pendingIntent = MediaStore.createDeleteRequest(resolver, uris)
                activity.startIntentSenderForResult(
                    pendingIntent.intentSender,
                    DELETE_REQUEST_CODE,
                    null, 0, 0, 0
                )
            } else {
                // Android 10 and below: direct delete each URI
                var allDeleted = true
                for (uri in uris) {
                    try {
                        val deleted = resolver.delete(uri, null, null)
                        if (deleted == 0) allDeleted = false
                    } catch (e: Exception) {
                        allDeleted = false
                    }
                }
                promise.resolve(allDeleted)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
