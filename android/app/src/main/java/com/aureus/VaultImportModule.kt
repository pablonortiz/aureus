package com.aureus

import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import android.content.ContentValues
import android.webkit.MimeTypeMap
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class VaultImportModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var deletePromise: Promise? = null

    companion object {
        const val DELETE_REQUEST_CODE = 9002
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
                    // Re-enable FLAG_SECURE after system dialog closes
                    activity.runOnUiThread {
                        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                    deletePromise?.resolve(resultCode == Activity.RESULT_OK)
                    deletePromise = null
                }
            }
        })
    }

    override fun getName(): String = "VaultImport"

    /**
     * Copy a file from a content:// URI to the vault path using InputStream.
     * Returns { fileSize: number }.
     */
    @ReactMethod
    fun copyToVault(contentUriStr: String, destPath: String, promise: Promise) {
        try {
            val uri = Uri.parse(contentUriStr)
            val resolver = reactApplicationContext.contentResolver

            val inputStream = resolver.openInputStream(uri)
            if (inputStream == null) {
                promise.reject("NO_INPUT", "Cannot open source file")
                return
            }

            val destFile = File(destPath)
            destFile.parentFile?.mkdirs()

            inputStream.use { input ->
                FileOutputStream(destFile).use { output ->
                    input.copyTo(output)
                }
            }

            val result = Arguments.createMap()
            result.putDouble("fileSize", destFile.length().toDouble())
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("COPY_ERROR", e.message)
        }
    }

    /**
     * Export a vault file to the Downloads folder via MediaStore.
     * Works on all Android versions with scoped storage.
     * Returns the display name of the exported file.
     */
    @ReactMethod
    fun exportToDownloads(sourcePath: String, fileName: String, promise: Promise) {
        try {
            val sourceFile = File(sourcePath)
            if (!sourceFile.exists()) {
                promise.reject("NOT_FOUND", "Source file does not exist")
                return
            }

            val ext = fileName.substringAfterLast('.', "")
            val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                ?: "application/octet-stream"

            val resolver = reactApplicationContext.contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
            }

            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
            if (uri == null) {
                promise.reject("EXPORT_ERROR", "Failed to create file in Downloads")
                return
            }

            FileInputStream(sourceFile).use { input ->
                resolver.openOutputStream(uri)?.use { output ->
                    input.copyTo(output)
                } ?: throw Exception("Cannot open output stream")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val updateValues = ContentValues().apply {
                    put(MediaStore.Downloads.IS_PENDING, 0)
                }
                resolver.update(uri, updateValues, null, null)
            }

            promise.resolve(fileName)
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", e.message)
        }
    }

    /**
     * Batch-remove originals from the device gallery (MediaStore).
     * Resolves any content URI to a proper MediaStore URI using query fallback.
     * Temporarily disables FLAG_SECURE so the system dialog is visible.
     * On Android 11+, shows a single system confirmation dialog.
     * On Android 10 and below, deletes directly.
     */
    @ReactMethod
    fun removeOriginals(uriStrings: ReadableArray, promise: Promise) {
        try {
            if (uriStrings.size() == 0) {
                promise.resolve(true)
                return
            }

            val resolver = reactApplicationContext.contentResolver
            val mediaStoreUris = mutableListOf<Uri>()

            for (i in 0 until uriStrings.size()) {
                val rawUri = Uri.parse(uriStrings.getString(i))
                val resolved = resolveToMediaStoreUri(rawUri)
                if (resolved != null) {
                    mediaStoreUris.add(resolved)
                }
            }

            if (mediaStoreUris.isEmpty()) {
                promise.resolve(false)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val activity = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.resolve(false)
                    return
                }

                // Temporarily disable FLAG_SECURE so the system delete dialog is visible
                activity.runOnUiThread {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }

                deletePromise = promise
                val pendingIntent = MediaStore.createDeleteRequest(resolver, mediaStoreUris)
                activity.startIntentSenderForResult(
                    pendingIntent.intentSender,
                    DELETE_REQUEST_CODE,
                    null, 0, 0, 0
                )
                // FLAG_SECURE will be re-enabled in onActivityResult
            } else {
                var allDeleted = true
                for (uri in mediaStoreUris) {
                    try {
                        val rows = resolver.delete(uri, null, null)
                        if (rows == 0) allDeleted = false
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

    /**
     * Resolve any content URI to a proper MediaStore URI.
     * Handles: MediaStore URIs, document-provider URIs, and generic content URIs.
     */
    private fun resolveToMediaStoreUri(uri: Uri): Uri? {
        // 1. Already a MediaStore URI (content://media/...)
        if (uri.authority == "media") return uri

        // 2. Document URI from media documents provider
        //    e.g. content://com.android.providers.media.documents/document/image%3A123
        try {
            if (DocumentsContract.isDocumentUri(reactApplicationContext, uri)) {
                val authority = uri.authority ?: ""
                if (authority == "com.android.providers.media.documents") {
                    val docId = DocumentsContract.getDocumentId(uri)
                    val parts = docId.split(":")
                    if (parts.size == 2) {
                        val type = parts[0]
                        val id = parts[1].toLongOrNull() ?: return null
                        return when (type) {
                            "image" -> ContentUris.withAppendedId(
                                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id
                            )
                            "video" -> ContentUris.withAppendedId(
                                MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id
                            )
                            else -> null
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        // 3. Generic fallback: query the content URI for MediaStore _id and mime_type
        //    Works for Google Photos, manufacturer galleries, etc.
        try {
            val resolver = reactApplicationContext.contentResolver
            val projection = arrayOf(
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.MIME_TYPE
            )
            resolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idIdx = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
                    val mimeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
                    if (idIdx >= 0 && mimeIdx >= 0) {
                        val id = cursor.getLong(idIdx)
                        val mimeType = cursor.getString(mimeIdx) ?: ""
                        return when {
                            mimeType.startsWith("image/") -> ContentUris.withAppendedId(
                                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id
                            )
                            mimeType.startsWith("video/") -> ContentUris.withAppendedId(
                                MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id
                            )
                            else -> null
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        // 4. Last resort: query MediaStore by DATA path
        try {
            val resolver = reactApplicationContext.contentResolver
            val pathProjection = arrayOf(MediaStore.MediaColumns.DATA)
            resolver.query(uri, pathProjection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val dataIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                    if (dataIdx >= 0) {
                        val filePath = cursor.getString(dataIdx) ?: return null
                        // Search in Images first
                        findMediaStoreUri(
                            resolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, filePath
                        )?.let { return it }
                        // Then Videos
                        findMediaStoreUri(
                            resolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI, filePath
                        )?.let { return it }
                    }
                }
            }
        } catch (_: Exception) {}

        return null
    }

    private fun findMediaStoreUri(
        resolver: android.content.ContentResolver,
        collection: Uri,
        filePath: String
    ): Uri? {
        val projection = arrayOf(MediaStore.MediaColumns._ID)
        val selection = "${MediaStore.MediaColumns.DATA} = ?"
        val args = arrayOf(filePath)
        resolver.query(collection, projection, selection, args, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID))
                return ContentUris.withAppendedId(collection, id)
            }
        }
        return null
    }
}
