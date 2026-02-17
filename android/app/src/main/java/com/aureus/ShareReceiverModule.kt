package com.aureus

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.util.UUID

class ShareReceiverModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ShareReceiver"

    private val vaultDir: File
        get() {
            val dir = File(reactApplicationContext.filesDir, "vault")
            if (!dir.exists()) dir.mkdirs()
            return dir
        }

    init {
        reactContext.addActivityEventListener(object : ActivityEventListener {
            override fun onActivityResult(
                activity: Activity, requestCode: Int, resultCode: Int, data: Intent?
            ) {}

            override fun onNewIntent(intent: Intent) {
                val action = intent.action ?: return
                if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) return

                try {
                    val files = processIntent(intent)
                    if (files != null && files.size() > 0) {
                        reactApplicationContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("onShareReceived", files)
                    }
                } catch (_: Exception) {}
            }
        })
    }

    @ReactMethod
    fun getShareIntent(promise: Promise) {
        try {
            val intent = reactApplicationContext.currentActivity?.intent
            if (intent == null) {
                promise.resolve(null)
                return
            }

            val action = intent.action
            if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) {
                promise.resolve(null)
                return
            }

            val files = processIntent(intent)
            promise.resolve(files)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearShareIntent() {
        reactApplicationContext.currentActivity?.intent = Intent()
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    private fun processIntent(intent: Intent): WritableArray? {
        val action = intent.action ?: return null
        val uris = mutableListOf<Uri>()

        when (action) {
            Intent.ACTION_SEND -> {
                val uri = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                }
                if (uri != null) uris.add(uri)
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                val extras = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                }
                if (extras != null) uris.addAll(extras)
            }
        }

        if (uris.isEmpty()) return null

        val resolver = reactApplicationContext.contentResolver
        val result = Arguments.createArray()

        for (uri in uris) {
            try {
                val map = copyUriToVault(uri, resolver)
                if (map != null) result.pushMap(map)
            } catch (_: Exception) {
                // Skip failed files
            }
        }

        return if (result.size() > 0) result else null
    }

    private fun copyUriToVault(
        uri: Uri,
        resolver: android.content.ContentResolver
    ): WritableMap? {
        // Query display name and mime type
        var displayName = "shared_file"
        var mimeType = "image/jpeg"

        resolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIdx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (nameIdx >= 0) {
                    displayName = cursor.getString(nameIdx) ?: displayName
                }
            }
        }

        resolver.getType(uri)?.let { mimeType = it }

        val mediaType = if (mimeType.startsWith("video")) "video" else "image"
        val filename = "${UUID.randomUUID()}.vault"
        val destFile = File(vaultDir, filename)

        val inputStream = resolver.openInputStream(uri) ?: return null
        inputStream.use { input ->
            destFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        val fileSize = destFile.length()

        // Try to delete the original silently
        var deleted = false
        try {
            // Try ContentResolver.delete first (works for owned files / older Android)
            val rows = resolver.delete(uri, null, null)
            deleted = rows > 0
        } catch (_: Exception) {}

        if (!deleted) {
            try {
                // Try DocumentsContract.deleteDocument (works for document URIs with write access)
                deleted = DocumentsContract.deleteDocument(resolver, uri)
            } catch (_: Exception) {}
        }

        val map = Arguments.createMap()
        map.putString("filename", filename)
        map.putString("vaultPath", destFile.absolutePath)
        map.putString("originalName", displayName)
        map.putString("mediaType", mediaType)
        map.putDouble("fileSize", fileSize.toDouble())
        map.putBoolean("deleted", deleted)
        map.putString("contentUri", uri.toString())
        return map
    }
}
