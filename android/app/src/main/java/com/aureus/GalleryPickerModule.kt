package com.aureus

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class GalleryPickerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pickerPromise: Promise? = null
    private var vaultDirPath: String = ""

    companion object {
        const val PICK_REQUEST_CODE = 9003
    }

    init {
        reactContext.addActivityEventListener(object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                if (requestCode == PICK_REQUEST_CODE) {
                    // Re-enable FLAG_SECURE after picker closes
                    activity.runOnUiThread {
                        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }

                    if (resultCode != Activity.RESULT_OK || data == null) {
                        pickerPromise?.resolve(Arguments.createArray())
                        pickerPromise = null
                        return
                    }

                    val promise = pickerPromise
                    val dir = vaultDirPath
                    pickerPromise = null

                    // Process on background thread to avoid blocking UI
                    Thread {
                        try {
                            val results = processPickedFiles(data, dir)
                            promise?.resolve(results)
                        } catch (e: Exception) {
                            promise?.reject("PROCESS_ERROR", e.message)
                        }
                    }.start()
                }
            }
        })
    }

    override fun getName(): String = "GalleryPicker"

    /**
     * Open the system file picker for images/videos, copy selected files
     * to the vault directory, and delete the originals.
     *
     * Returns an array of objects:
     * { filename, vaultPath, originalName, mediaType, fileSize, deleted }
     */
    @ReactMethod
    fun pickAndImport(vaultDir: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(Arguments.createArray())
            return
        }

        vaultDirPath = vaultDir
        pickerPromise = promise

        // Temporarily disable FLAG_SECURE so the picker is visible
        activity.runOnUiThread {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }

        activity.startActivityForResult(intent, PICK_REQUEST_CODE)
    }

    private fun processPickedFiles(data: Intent, vaultDir: String): WritableArray {
        val results = Arguments.createArray()
        val resolver = reactApplicationContext.contentResolver

        // Collect all selected URIs
        val uris = mutableListOf<Uri>()
        val clipData = data.clipData
        if (clipData != null) {
            for (i in 0 until clipData.itemCount) {
                uris.add(clipData.getItemAt(i).uri)
            }
        } else if (data.data != null) {
            uris.add(data.data!!)
        }

        // Ensure vault directory exists
        val vaultDirFile = File(vaultDir)
        if (!vaultDirFile.exists()) {
            vaultDirFile.mkdirs()
        }

        // Also ensure .nomedia exists
        val nomedia = File(vaultDir, ".nomedia")
        if (!nomedia.exists()) {
            nomedia.createNewFile()
        }

        for (uri in uris) {
            try {
                // Get file info
                val originalName = getDisplayName(uri) ?: "file_${System.currentTimeMillis()}"
                val mimeType = resolver.getType(uri) ?: ""
                val mediaType = if (mimeType.startsWith("video")) "video" else "image"

                // Generate vault filename
                val vaultFilename = "${UUID.randomUUID()}.vault"
                val vaultPath = "$vaultDir/$vaultFilename"
                val destFile = File(vaultPath)

                // Copy file to vault via InputStream
                val inputStream = resolver.openInputStream(uri)
                if (inputStream == null) continue

                inputStream.use { input ->
                    FileOutputStream(destFile).use { output ->
                        input.copyTo(output)
                    }
                }

                val fileSize = destFile.length()

                // Delete the original file
                var deleted = false
                try {
                    deleted = DocumentsContract.deleteDocument(resolver, uri)
                } catch (_: Exception) {
                    // Some providers don't support deletion — that's OK
                }

                val item = Arguments.createMap()
                item.putString("filename", vaultFilename)
                item.putString("vaultPath", vaultPath)
                item.putString("originalName", originalName)
                item.putString("mediaType", mediaType)
                item.putDouble("fileSize", fileSize.toDouble())
                item.putBoolean("deleted", deleted)
                results.pushMap(item)
            } catch (_: Exception) {
                continue
            }
        }

        return results
    }

    private fun getDisplayName(uri: Uri): String? {
        val resolver = reactApplicationContext.contentResolver
        try {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                if (it.moveToFirst()) {
                    val idx = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) return it.getString(idx)
                }
            }
        } catch (_: Exception) {}
        return uri.lastPathSegment
    }
}
