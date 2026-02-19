package com.aureus.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.aureus.MainActivity
import com.aureus.R

class TasksWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_COMPLETE_TASK = "com.aureus.widget.ACTION_COMPLETE_TASK"
        const val EXTRA_TASK_ID = "com.aureus.widget.EXTRA_TASK_ID"

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, TasksWidgetProvider::class.java)
            val widgetIds = manager.getAppWidgetIds(componentName)
            if (widgetIds.isNotEmpty()) {
                val intent = Intent(context, TasksWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_COMPLETE_TASK) {
            val taskId = intent.getLongExtra(EXTRA_TASK_ID, -1)
            if (taskId > 0) {
                TasksWidgetDbHelper.completeTask(context, taskId)
                updateAllWidgets(context)
            }
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
        val prefs = context.getSharedPreferences("widget_config_$widgetId", Context.MODE_PRIVATE)
        val filterMode = prefs.getString("filter_mode", "all") ?: "all"

        val subtitle = when (filterMode) {
            "high" -> "Prioridad alta"
            "category" -> prefs.getString("filter_category_name", "Todas") ?: "Todas"
            else -> "Todas las tareas"
        }

        val views = RemoteViews(context.packageName, R.layout.widget_tasks)
        views.setTextViewText(R.id.widget_subtitle, subtitle)

        // Set up the list adapter
        val serviceIntent = Intent(context, TasksWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_task_list, serviceIntent)
        views.setEmptyView(R.id.widget_task_list, R.id.widget_empty_text)

        // Complete task intent template
        val completeIntent = Intent(context, TasksWidgetProvider::class.java).apply {
            action = ACTION_COMPLETE_TASK
        }
        val completePendingIntent = PendingIntent.getBroadcast(
            context, 0, completeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_task_list, completePendingIntent)

        // Add button → open app to AddTask
        val addIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.aureus.ADD_TASK"
            data = Uri.parse("aureus://add-task")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val addPendingIntent = PendingIntent.getActivity(
            context, 1, addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_add_button, addPendingIntent)

        // Title → open app to Tasks
        val openIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.aureus.OPEN_TASKS"
            data = Uri.parse("aureus://tasks")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            context, 2, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openPendingIntent)

        // Notify data changed to refresh list
        appWidgetManager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_task_list)
        appWidgetManager.updateAppWidget(widgetId, views)
    }
}
