package com.budgetapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.budgetapp.MainActivity
import com.budgetapp.R
import java.util.Locale

class UpcomingPaymentsWidgetProvider : AppWidgetProvider() {
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

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)

    when (intent.action) {
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_LOCALE_CHANGED,
      -> updateAllWidgets(context)
    }
  }

  private data class Snapshot(
    val hasData: Boolean,
    val language: String,
    val title: String,
    val nextName: String,
    val nextAmount: String,
    val nextTiming: String,
    val countLabel: String,
    val totalLabel: String,
    val totalValue: String,
    val contentDescription: String,
    val isSyncing: Boolean,
    val isStale: Boolean,
    val updatedAt: Long,
  )

  companion object {
    internal const val PREFERENCES_NAME = "upcoming_payments_widget_snapshot"
    internal const val KEY_STATE = "state"
    internal const val KEY_LANGUAGE = "language"
    internal const val KEY_TITLE = "title"
    internal const val KEY_NEXT_NAME = "next_name"
    internal const val KEY_NEXT_AMOUNT = "next_amount"
    internal const val KEY_NEXT_TIMING = "next_timing"
    internal const val KEY_COUNT_LABEL = "count_label"
    internal const val KEY_TOTAL_LABEL = "total_label"
    internal const val KEY_TOTAL_VALUE = "total_value"
    internal const val KEY_CONTENT_DESCRIPTION = "content_description"
    internal const val KEY_SYNCING = "syncing"
    internal const val KEY_STALE = "stale"
    internal const val KEY_UPDATED_AT = "updated_at"

    private const val COMPACT_MAX_WIDTH = 220
    private const val COMPACT_COUNT_MIN_HEIGHT = 130
    private const val TOTAL_MIN_HEIGHT = 145
    private const val COMPACT_FOOTNOTE_MIN_HEIGHT = 155
    private const val FOOTNOTE_MIN_HEIGHT = 180
    private const val STALE_AFTER_MINUTES = 12 * 60L
    private const val REQUEST_OFFSET_OPEN = 8

    internal fun updateAllWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, UpcomingPaymentsWidgetProvider::class.java)
      manager.getAppWidgetIds(component).forEach { appWidgetId ->
        renderWidget(context, manager, appWidgetId)
      }
    }

    private fun renderWidget(
      context: Context,
      manager: AppWidgetManager,
      appWidgetId: Int,
    ) {
      val size = WidgetSize.of(context, manager, appWidgetId)
      manager.updateAppWidget(
        appWidgetId,
        buildViews(context, appWidgetId, size.width, size.height),
      )
    }

    internal fun buildViews(
      context: Context,
      appWidgetId: Int,
      width: Int,
      height: Int,
    ): RemoteViews {
      val isCompact = width < COMPACT_MAX_WIDTH
      val layoutId = if (isCompact) {
        R.layout.upcoming_payments_widget_compact
      } else {
        R.layout.upcoming_payments_widget
      }
      val views = RemoteViews(context.packageName, layoutId)
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val snapshot = readSnapshot(context, preferences)
      val localizedContext = localizedContext(context, snapshot.language)
      val primaryTitle = if (snapshot.hasData) snapshot.nextName else snapshot.title
      val supportingText = if (snapshot.hasData) snapshot.nextTiming else snapshot.nextName
      val footnote = footnoteText(localizedContext, snapshot)

      views.setTextViewText(
        R.id.upcoming_widget_label,
        localizedContext.getString(R.string.upcoming_widget_name),
      )
      views.setTextViewText(R.id.upcoming_widget_count, snapshot.countLabel)
      val showCount = snapshot.hasData &&
        snapshot.countLabel.isNotBlank() &&
        (!isCompact || height >= COMPACT_COUNT_MIN_HEIGHT)
      views.setViewVisibility(
        R.id.upcoming_widget_count,
        if (showCount) View.VISIBLE else View.GONE,
      )
      views.setTextViewText(R.id.upcoming_widget_name, primaryTitle)
      views.setTextViewText(R.id.upcoming_widget_amount, snapshot.nextAmount)
      views.setViewVisibility(
        R.id.upcoming_widget_amount,
        if (snapshot.hasData) View.VISIBLE else View.GONE,
      )
      views.setTextViewText(R.id.upcoming_widget_timing, supportingText)
      views.setViewVisibility(
        R.id.upcoming_widget_timing,
        if (supportingText.isNotBlank()) View.VISIBLE else View.GONE,
      )

      val showTotal = snapshot.hasData &&
        snapshot.totalValue.isNotBlank() &&
        !isCompact &&
        height >= TOTAL_MIN_HEIGHT
      views.setTextViewText(R.id.upcoming_widget_total_label, snapshot.totalLabel)
      views.setTextViewText(R.id.upcoming_widget_total_value, snapshot.totalValue)
      views.setViewVisibility(
        R.id.upcoming_widget_total_row,
        if (showTotal) View.VISIBLE else View.GONE,
      )

      val footnoteMinHeight = if (isCompact) COMPACT_FOOTNOTE_MIN_HEIGHT else FOOTNOTE_MIN_HEIGHT
      val showFootnote = footnote.isNotBlank() && height >= footnoteMinHeight
      views.setTextViewText(R.id.upcoming_widget_footnote, footnote)
      views.setViewVisibility(
        R.id.upcoming_widget_footnote_row,
        if (showFootnote) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.upcoming_widget_footnote_icon,
        if (showFootnote && needsAttention(snapshot)) View.VISIBLE else View.GONE,
      )

      val contentDescription = listOf(snapshot.contentDescription, footnote)
        .filter { it.isNotBlank() }
        .joinToString(separator = ". ")
      views.setContentDescription(R.id.upcoming_widget_root, contentDescription)
      views.setOnClickPendingIntent(
        R.id.upcoming_widget_root,
        openUpcomingIntent(context, appWidgetId),
      )

      return views
    }

    private fun readSnapshot(
      context: Context,
      preferences: SharedPreferences,
    ): Snapshot {
      val state = preferences.getString(KEY_STATE, null)
      val language = preferences.getString(KEY_LANGUAGE, "").orEmpty()

      if (state == null) {
        val setupContext = localizedContext(context, language)
        val title = setupContext.getString(R.string.upcoming_widget_setup_title)
        val meta = setupContext.getString(R.string.upcoming_widget_setup_meta)

        return Snapshot(
          hasData = false,
          language = language,
          title = title,
          nextName = meta,
          nextAmount = "",
          nextTiming = "",
          countLabel = "",
          totalLabel = "",
          totalValue = "",
          contentDescription = "$title. $meta",
          isSyncing = false,
          isStale = false,
          updatedAt = 0L,
        )
      }

      val title = preferences.getString(KEY_TITLE, "").orEmpty()
      return Snapshot(
        hasData = state == "data",
        language = language,
        title = title,
        nextName = preferences.getString(KEY_NEXT_NAME, "").orEmpty(),
        nextAmount = preferences.getString(KEY_NEXT_AMOUNT, "").orEmpty(),
        nextTiming = preferences.getString(KEY_NEXT_TIMING, "").orEmpty(),
        countLabel = preferences.getString(KEY_COUNT_LABEL, "").orEmpty(),
        totalLabel = preferences.getString(KEY_TOTAL_LABEL, "").orEmpty(),
        totalValue = preferences.getString(KEY_TOTAL_VALUE, "").orEmpty(),
        contentDescription = preferences.getString(KEY_CONTENT_DESCRIPTION, title) ?: title,
        isSyncing = preferences.getBoolean(KEY_SYNCING, false),
        isStale = preferences.getBoolean(KEY_STALE, false),
        updatedAt = preferences.getLong(KEY_UPDATED_AT, 0L),
      )
    }

    private fun footnoteText(context: Context, snapshot: Snapshot): String {
      if (snapshot.isSyncing) {
        return context.getString(R.string.budget_widget_syncing)
      }

      if (snapshot.isStale) {
        return context.getString(R.string.budget_widget_offline)
      }

      if (!snapshot.hasData || snapshot.updatedAt <= 0L) {
        return ""
      }

      val minutes = ((System.currentTimeMillis() - snapshot.updatedAt) / 60_000L)
        .coerceAtLeast(0L)
      return when {
        minutes < 2L -> context.getString(R.string.budget_widget_updated_now)
        minutes < 60L -> context.getString(R.string.budget_widget_updated_minutes, minutes.toInt())
        minutes < 24 * 60L -> context.getString(
          R.string.budget_widget_updated_hours,
          (minutes / 60L).toInt(),
        )
        else -> context.getString(
          R.string.budget_widget_updated_days,
          (minutes / (24 * 60L)).toInt(),
        )
      }
    }

    private fun needsAttention(snapshot: Snapshot): Boolean {
      if (snapshot.isSyncing) {
        return false
      }
      if (snapshot.isStale) {
        return true
      }
      if (!snapshot.hasData || snapshot.updatedAt <= 0L) {
        return false
      }

      return (System.currentTimeMillis() - snapshot.updatedAt) / 60_000L >= STALE_AFTER_MINUTES
    }

    private fun localizedContext(context: Context, language: String): Context {
      if (language.isBlank()) {
        return context
      }

      val configuration = Configuration(context.resources.configuration)
      configuration.setLocale(Locale.forLanguageTag(language))
      return context.createConfigurationContext(configuration)
    }

    private fun openUpcomingIntent(context: Context, appWidgetId: Int): PendingIntent {
      val intent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("budgetapp://subscriptions/upcoming?days=7"),
        context,
        MainActivity::class.java,
      ).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      }

      return PendingIntent.getActivity(
        context,
        (appWidgetId * 10) + REQUEST_OFFSET_OPEN,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
