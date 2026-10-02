package com.budgetapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews
import com.budgetapp.MainActivity
import com.budgetapp.R

class QuickAddWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    appWidgetIds.forEach { appWidgetId ->
      renderWidget(context, appWidgetManager, appWidgetId)
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    renderWidget(context, appWidgetManager, appWidgetId)
  }

  companion object {
    private const val ROW_MIN_WIDTH = 300
    private const val STACKED_MIN_WIDTH = 190

    private fun renderWidget(
      context: Context,
      manager: AppWidgetManager,
      appWidgetId: Int,
    ) {
      val size = WidgetSize.of(context, manager, appWidgetId)

      manager.updateAppWidget(appWidgetId, buildViews(context, appWidgetId, size.width))
    }

    /** Builds the remote views for one widget width; shared with the debug preview harness. */
    internal fun buildViews(
      context: Context,
      appWidgetId: Int,
      width: Int,
    ): RemoteViews {
      // Shortcuts drop their labels before they drop the shortcut itself.
      val layoutId = when {
        width >= ROW_MIN_WIDTH -> R.layout.quick_add_widget
        width >= STACKED_MIN_WIDTH -> R.layout.quick_add_widget_medium
        else -> R.layout.quick_add_widget_compact
      }
      val hasSecondaryActions = width >= STACKED_MIN_WIDTH
      val views = RemoteViews(context.packageName, layoutId)

      views.setOnClickPendingIntent(
        R.id.quick_add_expense,
        createPendingIntent(context, appWidgetId, QuickAddType.EXPENSE),
      )

      if (hasSecondaryActions) {
        views.setOnClickPendingIntent(
          R.id.quick_add_income,
          createPendingIntent(context, appWidgetId, QuickAddType.INCOME),
        )
        views.setOnClickPendingIntent(
          R.id.quick_add_subscription,
          createPendingIntent(context, appWidgetId, QuickAddType.SUBSCRIPTION),
        )
      }

      return views
    }

    private fun createPendingIntent(
      context: Context,
      appWidgetId: Int,
      type: QuickAddType,
    ): PendingIntent {
      val intent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("budgetapp://add/${type.path}"),
        context,
        MainActivity::class.java,
      ).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
      val requestCode = (appWidgetId * 10) + type.requestCodeOffset

      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }

  private enum class QuickAddType(
    val path: String,
    val requestCodeOffset: Int,
  ) {
    EXPENSE("expense", 1),
    INCOME("income", 2),
    SUBSCRIPTION("subscription", 3),
  }
}
