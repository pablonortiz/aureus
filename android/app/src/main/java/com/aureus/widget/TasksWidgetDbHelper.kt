package com.aureus.widget

import android.content.Context
import android.database.sqlite.SQLiteDatabase

data class WidgetTask(
    val id: Long,
    val title: String,
    val priority: String,
    val categoryName: String?,
    val categoryColor: String?,
    val time: String?,
    val date: String?
)

object TasksWidgetDbHelper {
    private fun getDb(context: Context): SQLiteDatabase? {
        return try {
            val dbPath = context.getDatabasePath("aureus.db")
            if (dbPath.exists()) {
                SQLiteDatabase.openDatabase(dbPath.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    fun getPendingTasks(
        context: Context,
        filterMode: String = "all",
        filterCategoryId: Long = -1
    ): List<WidgetTask> {
        val db = getDb(context) ?: return emptyList()
        val tasks = mutableListOf<WidgetTask>()

        try {
            val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                .format(java.util.Date())

            var sql = """
                SELECT t.id, t.title, t.priority, t.time, t.date,
                       tc.name as cat_name, tc.color as cat_color
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                WHERE t.is_completed = 0
                  AND (t.date IS NULL OR t.date <= ?)
            """.trimIndent()
            val args = mutableListOf<String>(today)

            when (filterMode) {
                "high" -> {
                    sql += " AND t.priority = 'high'"
                }
                "category" -> {
                    if (filterCategoryId > 0) {
                        sql += " AND t.category_id = ?"
                        args.add(filterCategoryId.toString())
                    }
                }
            }

            sql += """
                ORDER BY
                  CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
                  t.date ASC,
                  t.created_at DESC
                LIMIT 20
            """.trimIndent()

            val cursor = db.rawQuery(sql, args.toTypedArray())
            while (cursor.moveToNext()) {
                tasks.add(WidgetTask(
                    id = cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    title = cursor.getString(cursor.getColumnIndexOrThrow("title")),
                    priority = cursor.getString(cursor.getColumnIndexOrThrow("priority")),
                    categoryName = cursor.getString(cursor.getColumnIndexOrThrow("cat_name")),
                    categoryColor = cursor.getString(cursor.getColumnIndexOrThrow("cat_color")),
                    time = cursor.getString(cursor.getColumnIndexOrThrow("time")),
                    date = cursor.getString(cursor.getColumnIndexOrThrow("date"))
                ))
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }

        return tasks
    }

    fun completeTask(context: Context, taskId: Long) {
        val db = getDb(context) ?: return
        try {
            val now = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US)
                .format(java.util.Date())
            db.execSQL(
                "UPDATE tasks SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ?",
                arrayOf(now, now, taskId)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
    }

    fun getCategories(context: Context): List<Pair<Long, String>> {
        val db = getDb(context) ?: return emptyList()
        val categories = mutableListOf<Pair<Long, String>>()

        try {
            val cursor = db.rawQuery(
                "SELECT id, name FROM task_categories ORDER BY is_default DESC, name ASC",
                null
            )
            while (cursor.moveToNext()) {
                categories.add(Pair(
                    cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    cursor.getString(cursor.getColumnIndexOrThrow("name"))
                ))
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }

        return categories
    }
}
