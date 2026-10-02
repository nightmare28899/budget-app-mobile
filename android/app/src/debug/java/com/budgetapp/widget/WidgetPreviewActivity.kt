package com.budgetapp.widget

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Debug-only harness that renders the launcher widgets at several sizes so layout
 * regressions can be screenshotted without adding widgets to a home screen.
 */
class WidgetPreviewActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#12141F"))
      setPadding(dp(12), dp(12), dp(12), dp(12))
    }

    seedSnapshot(intent.getStringExtra("scenario") ?: "data")

    listOf(
      Triple("budget 320x250", 320, 250),
      Triple("budget 250x160", 250, 160),
      Triple("budget 250x110", 250, 110),
      Triple("budget 150x180", 150, 180),
      Triple("budget 110x110", 110, 110),
    ).forEach { (label, width, height) ->
      root.addView(label(label))
      root.addView(budgetPreview(width, height))
    }

    listOf(
      Triple("quickAdd 320x72", 320, 72),
      Triple("quickAdd 280x72", 280, 72),
      Triple("quickAdd 250x72", 250, 72),
      Triple("quickAdd 190x72", 190, 72),
      Triple("quickAdd 120x72", 120, 72),
    ).forEach { (label, width, height) ->
      root.addView(label(label))
      root.addView(quickAddPreview(width, height))
    }

    setContentView(
      ScrollView(this).apply {
        addView(
          root,
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        )
      },
    )
  }

  private fun budgetPreview(width: Int, height: Int): ViewGroup {
    val container = FrameLayout(this)
    val views = BudgetWidgetProvider.buildViews(this, 1, width, height)
    container.addView(views.apply(this, container))

    return frame(container, width, height)
  }

  private fun quickAddPreview(width: Int, height: Int): ViewGroup {
    val container = FrameLayout(this)
    val views = QuickAddWidgetProvider.buildViews(this, 1, width)
    container.addView(views.apply(this, container))

    return frame(container, width, height)
  }

  private fun frame(child: ViewGroup, width: Int, height: Int): ViewGroup {
    return LinearLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(width), dp(height)).apply {
        bottomMargin = dp(14)
      }
      addView(child, dp(width), dp(height))
    }
  }

  private fun label(text: String): TextView {
    return TextView(this).apply {
      setText(text)
      setTextColor(Color.parseColor("#94A3B8"))
      textSize = 11f
      gravity = Gravity.START
      setPadding(0, 0, 0, dp(4))
    }
  }

  private fun seedSnapshot(scenario: String) {
    val preferences = getSharedPreferences(
      BudgetWidgetProvider.PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    )
    val editor = preferences.edit().clear()

    when (scenario) {
      "empty" -> editor
        .putString(BudgetWidgetProvider.KEY_STATE, "empty")
        .putString(BudgetWidgetProvider.KEY_LANGUAGE, "es")
        .putString(BudgetWidgetProvider.KEY_TITLE, "Aún no hay presupuesto")
        .putString(BudgetWidgetProvider.KEY_VALUE, "—")
        .putString(
          BudgetWidgetProvider.KEY_META,
          "Abre BudgetApp para configurar tu presupuesto.",
        )
        .putString(BudgetWidgetProvider.KEY_TONE, "neutral")

      "danger" -> editor
        .putString(BudgetWidgetProvider.KEY_STATE, "data")
        .putString(BudgetWidgetProvider.KEY_LANGUAGE, "es")
        .putString(BudgetWidgetProvider.KEY_TITLE, "Disponible para gastar")
        .putString(BudgetWidgetProvider.KEY_VALUE, "-$1,250.00")
        .putString(BudgetWidgetProvider.KEY_STATUS_LABEL, "125% usado")
        .putString(BudgetWidgetProvider.KEY_PERIOD_LABEL, "Mensual")
        .putString(BudgetWidgetProvider.KEY_SPENT_LABEL, "Gastado")
        .putString(BudgetWidgetProvider.KEY_SPENT_VALUE, "$11,250.00")
        .putString(BudgetWidgetProvider.KEY_BUDGET_LABEL, "Presupuesto")
        .putString(BudgetWidgetProvider.KEY_BUDGET_VALUE, "$10,000.00")
        .putInt(BudgetWidgetProvider.KEY_PERCENTAGE, 100)
        .putString(BudgetWidgetProvider.KEY_TONE, "danger")
        .putBoolean(BudgetWidgetProvider.KEY_STALE, true)
        .putLong(
          BudgetWidgetProvider.KEY_UPDATED_AT,
          System.currentTimeMillis() - 3 * 60 * 60 * 1000L,
        )

      "setup" -> Unit

      else -> editor
        .putString(BudgetWidgetProvider.KEY_STATE, "data")
        .putString(BudgetWidgetProvider.KEY_LANGUAGE, "es")
        .putString(BudgetWidgetProvider.KEY_TITLE, "Disponible para gastar")
        .putString(BudgetWidgetProvider.KEY_VALUE, "$1,240.00")
        .putString(BudgetWidgetProvider.KEY_STATUS_LABEL, "38% usado")
        .putString(BudgetWidgetProvider.KEY_PERIOD_LABEL, "Mensual")
        .putString(BudgetWidgetProvider.KEY_SPENT_LABEL, "Gastado")
        .putString(BudgetWidgetProvider.KEY_SPENT_VALUE, "$760.00")
        .putString(BudgetWidgetProvider.KEY_BUDGET_LABEL, "Presupuesto")
        .putString(BudgetWidgetProvider.KEY_BUDGET_VALUE, "$2,000.00")
        .putInt(BudgetWidgetProvider.KEY_PERCENTAGE, 38)
        .putString(BudgetWidgetProvider.KEY_TONE, "safe")
        .putLong(
          BudgetWidgetProvider.KEY_UPDATED_AT,
          System.currentTimeMillis() - 4 * 60 * 1000L,
        )
    }

    editor.commit()
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }
}
