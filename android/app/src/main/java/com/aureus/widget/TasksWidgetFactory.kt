package com.aureus.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.aureus.R

class TasksWidgetFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private var tasks = listOf<WidgetTask>()
    private val widgetId = intent.getIntExtra(
        AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID
    )

    override fun onCreate() {}

    override fun onDataSetChanged() {
        val prefs = context.getSharedPreferences("widget_config_$widgetId", Context.MODE_PRIVATE)
        val filterMode = prefs.getString("filter_mode", "all") ?: "all"
        val filterCategoryId = prefs.getLong("filter_category_id", -1)
        tasks = TasksWidgetDbHelper.getPendingTasks(context, filterMode, filterCategoryId)
    }

    override fun onDestroy() {
        tasks = emptyList()
    }

    override fun getCount(): Int = tasks.size

    override fun getViewAt(position: Int): RemoteViews {
        val task = tasks[position]
        val views = RemoteViews(context.packageName, R.layout.widget_tasks_item)

        views.setTextViewText(R.id.widget_item_title, task.title)

        // Priority dot color
        val priorityColor = when (task.priority) {
            "high" -> Color.parseColor("#ef4444")
            "medium" -> Color.parseColor("#e8ba30")
            else -> Color.parseColor("#94a3b8")
        }
        views.setInt(R.id.widget_item_priority_dot, "setColorFilter", priorityColor)

        // Category
        if (task.categoryName != null) {
            views.setTextViewText(R.id.widget_item_category, task.categoryName)
            views.setViewVisibility(R.id.widget_item_category, android.view.View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.widget_item_category, android.view.View.GONE)
        }

        // Time
        if (task.time != null) {
            views.setTextViewText(R.id.widget_item_time, task.time)
            views.setViewVisibility(R.id.widget_item_time, android.view.View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.widget_item_time, android.view.View.GONE)
        }

        // Click on checkbox → complete task
        val fillInIntent = Intent().apply {
            putExtra(TasksWidgetProvider.EXTRA_TASK_ID, task.id)
        }
        views.setOnClickFillInIntent(R.id.widget_item_checkbox, fillInIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = tasks[position].id

    override fun hasStableIds(): Boolean = true
}
