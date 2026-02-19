package com.aureus

import com.aureus.widget.TasksWidgetProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TasksWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TasksWidget"

    @ReactMethod
    fun updateWidget() {
        TasksWidgetProvider.updateAllWidgets(reactApplicationContext)
    }
}
