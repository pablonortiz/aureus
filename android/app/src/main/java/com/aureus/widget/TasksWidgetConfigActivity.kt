package com.aureus.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*

class TasksWidgetConfigActivity : Activity() {

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectedMode = "all"
    private var selectedCategoryId = -1L
    private var selectedCategoryName = ""
    private var categories = listOf<Pair<Long, String>>()
    private lateinit var categorySpinner: Spinner

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Default result = canceled
        setResult(RESULT_CANCELED)

        widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        categories = TasksWidgetDbHelper.getCategories(this)

        buildUI()
    }

    private fun buildUI() {
        val bgColor = Color.parseColor("#1a1812")
        val surfaceColor = Color.parseColor("#26241c")
        val goldColor = Color.parseColor("#e8ba30")
        val textColor = Color.parseColor("#f1f5f9")
        val textSecondary = Color.parseColor("#94a3b8")

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bgColor)
            setPadding(48, 64, 48, 48)
        }

        // Title
        val title = TextView(this).apply {
            text = "AUREUS TASKS"
            setTextColor(goldColor)
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 8)
        }
        root.addView(title)

        val subtitle = TextView(this).apply {
            text = "Configurar Widget"
            setTextColor(textSecondary)
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }
        root.addView(subtitle)

        // Radio group
        val radioGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
        }

        val radioAll = RadioButton(this).apply {
            text = "Todas las tareas"
            setTextColor(textColor)
            id = View.generateViewId()
            isChecked = true
        }
        radioGroup.addView(radioAll)

        val radioHigh = RadioButton(this).apply {
            text = "Solo prioridad alta"
            setTextColor(textColor)
            id = View.generateViewId()
        }
        radioGroup.addView(radioHigh)

        val radioCategory = RadioButton(this).apply {
            text = "Por categoría"
            setTextColor(textColor)
            id = View.generateViewId()
        }
        radioGroup.addView(radioCategory)

        root.addView(radioGroup, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        // Category spinner
        categorySpinner = Spinner(this).apply {
            visibility = View.GONE
            setPadding(0, 16, 0, 0)
        }
        val categoryNames = categories.map { it.second }
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, categoryNames)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        categorySpinner.adapter = adapter
        categorySpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (categories.isNotEmpty()) {
                    selectedCategoryId = categories[position].first
                    selectedCategoryName = categories[position].second
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        root.addView(categorySpinner, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        radioGroup.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                radioAll.id -> {
                    selectedMode = "all"
                    categorySpinner.visibility = View.GONE
                }
                radioHigh.id -> {
                    selectedMode = "high"
                    categorySpinner.visibility = View.GONE
                }
                radioCategory.id -> {
                    selectedMode = "category"
                    categorySpinner.visibility = View.VISIBLE
                }
            }
        }

        // Spacer
        val spacer = View(this)
        root.addView(spacer, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        // Confirm button
        val confirmBtn = Button(this).apply {
            text = "CONFIRMAR"
            setTextColor(bgColor)
            setBackgroundColor(goldColor)
            setPadding(0, 24, 0, 24)
            setOnClickListener {
                saveConfig()
            }
        }
        root.addView(confirmBtn, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        setContentView(root)
    }

    private fun saveConfig() {
        val prefs = getSharedPreferences("widget_config_$widgetId", MODE_PRIVATE)
        prefs.edit().apply {
            putString("filter_mode", selectedMode)
            putLong("filter_category_id", selectedCategoryId)
            putString("filter_category_name", selectedCategoryName)
            apply()
        }

        // Update the widget
        val manager = AppWidgetManager.getInstance(this)
        TasksWidgetProvider().onUpdate(this, manager, intArrayOf(widgetId))

        val resultValue = Intent().apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        setResult(RESULT_OK, resultValue)
        finish()
    }
}
