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
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.budgetapp.MainActivity
import com.budgetapp.R
import java.util.Locale

class BudgetWidgetProvider : AppWidgetProvider() {
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

    // The footer shows how old the snapshot is, so day/clock/locale changes must repaint it.
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
    val value: String,
    val meta: String,
    val statusLabel: String,
    val periodLabel: String,
    val spentLabel: String,
    val spentValue: String,
    val budgetLabel: String,
    val budgetValue: String,
    val percentage: Int,
    val tone: String,
    val contentDescription: String,
    val isSyncing: Boolean,
    val isStale: Boolean,
    val updatedAt: Long,
  )

  companion object {
    internal const val PREFERENCES_NAME = "budget_widget_snapshot"
    internal const val KEY_STATE = "state"
    internal const val KEY_LANGUAGE = "language"
    internal const val KEY_TITLE = "title"
    internal const val KEY_VALUE = "value"
    internal const val KEY_META = "meta"
    internal const val KEY_STATUS_LABEL = "status_label"
    internal const val KEY_PERIOD_LABEL = "period_label"
    internal const val KEY_SPENT_LABEL = "spent_label"
    internal const val KEY_SPENT_VALUE = "spent_value"
    internal const val KEY_BUDGET_LABEL = "budget_label"
    internal const val KEY_BUDGET_VALUE = "budget_value"
    internal const val KEY_PERCENTAGE = "percentage"
    internal const val KEY_TONE = "tone"
    internal const val KEY_CONTENT_DESCRIPTION = "content_description"
    internal const val KEY_SYNCING = "syncing"
    internal const val KEY_STALE = "stale"
    internal const val KEY_UPDATED_AT = "updated_at"

    private const val COMPACT_MAX_WIDTH = 220

    // Approximate dp cost of each block, used to fill the height the launcher gives us.
    private const val BASE_HEIGHT = 104
    private const val BASE_HEIGHT_COMPACT = 104
    private const val EMPTY_BASE_HEIGHT = 46
    private const val EMPTY_BASE_HEIGHT_COMPACT = 54
    private const val META_HEIGHT = 36
    private const val HEADER_HEIGHT = 25
    private const val STATUS_HEIGHT = 27
    private const val BREAKDOWN_HEIGHT = 43
    private const val FOOTNOTE_HEIGHT = 22
    private const val ACTIONS_HEIGHT = 56
    private const val ACTIONS_HEIGHT_COMPACT = 52

    private const val STALE_AFTER_MINUTES = 12 * 60L

    private const val REQUEST_OFFSET_OPEN = 5
    private const val REQUEST_OFFSET_ADD = 6
    private const val REQUEST_OFFSET_REFRESH = 7

    internal fun updateAllWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, BudgetWidgetProvider::class.java)
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

    /** Builds the remote views for one widget size; shared with the debug preview harness. */
    internal fun buildViews(
      context: Context,
      appWidgetId: Int,
      width: Int,
      height: Int,
    ): RemoteViews {
      val isCompact = width < COMPACT_MAX_WIDTH
      // One UI ships large font presets, and sp text grows with them.
      val fontScale = context.resources.configuration.fontScale.coerceIn(1f, 1.6f)
      val layoutId = if (isCompact) {
        R.layout.budget_widget_compact
      } else {
        R.layout.budget_widget
      }
      val views = RemoteViews(context.packageName, layoutId)
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val snapshot = readSnapshot(context, preferences)
      val localizedContext = localizedContext(context, snapshot.language)

      val accentColor = localizedContext.color(R.color.widget_accent_soft)
      val toneColor = when (snapshot.tone) {
        "safe" -> localizedContext.color(R.color.widget_safe)
        "warning" -> localizedContext.color(R.color.widget_warning)
        "danger" -> localizedContext.color(R.color.widget_danger)
        else -> accentColor
      }
      // Colour is reserved for states that need attention; healthy numbers stay neutral.
      val valueColor = when (snapshot.tone) {
        "warning", "danger" -> toneColor
        else -> localizedContext.color(R.color.widget_text_primary)
      }

      val periodLabel = if (snapshot.periodLabel.isNotBlank()) {
        snapshot.periodLabel
      } else {
        localizedContext.getString(R.string.app_name)
      }
      views.setTextViewText(R.id.widget_period, periodLabel)
      views.setTextViewText(R.id.widget_title, snapshot.title)
      views.setTextViewText(R.id.widget_value, snapshot.value)
      views.setTextColor(R.id.widget_value, valueColor)
      views.setTextViewTextSize(
        R.id.widget_value,
        TypedValue.COMPLEX_UNIT_SP,
        valueTextSize(snapshot.value, width, isCompact, fontScale),
      )

      // Without a real amount the placeholder dash is noise: the title becomes the headline.
      views.setViewVisibility(
        R.id.widget_value,
        if (snapshot.hasData) View.VISIBLE else View.GONE,
      )
      views.setTextColor(
        R.id.widget_title,
        if (snapshot.hasData) {
          localizedContext.color(R.color.widget_text_muted)
        } else {
          localizedContext.color(R.color.widget_text_primary)
        },
      )
      views.setTextViewTextSize(
        R.id.widget_title,
        TypedValue.COMPLEX_UNIT_SP,
        titleTextSize(snapshot.hasData, isCompact),
      )

      val footnote = footnoteText(localizedContext, snapshot)
      val layout = resolveLayout(
        height = height,
        isCompact = isCompact,
        fontScale = fontScale,
        hasData = snapshot.hasData,
        hasStatus = snapshot.statusLabel.isNotBlank(),
        hasBreakdown = snapshot.spentValue.isNotBlank(),
        hasMeta = snapshot.meta.isNotBlank(),
        hasFootnote = footnote.isNotBlank(),
      )

      views.setViewVisibility(
        R.id.widget_header,
        if (layout.showHeader) View.VISIBLE else View.GONE,
      )
      val showStatus = layout.showStatus
      views.setTextViewText(R.id.widget_status, snapshot.statusLabel)
      views.setTextColor(R.id.widget_status, toneColor)
      views.setInt(R.id.widget_status, "setBackgroundResource", badgeBackground(snapshot.tone))
      views.setViewVisibility(
        R.id.widget_status,
        if (showStatus) View.VISIBLE else View.GONE,
      )

      renderProgress(views, snapshot)

      views.setViewVisibility(
        R.id.widget_breakdown,
        if (layout.showBreakdown) View.VISIBLE else View.GONE,
      )
      views.setTextViewText(R.id.widget_spent_label, snapshot.spentLabel)
      views.setTextViewText(R.id.widget_spent_value, snapshot.spentValue)
      views.setTextViewText(R.id.widget_budget_label, snapshot.budgetLabel)
      views.setTextViewText(R.id.widget_budget_value, snapshot.budgetValue)

      // The helper copy only matters while there is nothing to chart.
      views.setTextViewText(R.id.widget_meta, snapshot.meta)
      views.setViewVisibility(
        R.id.widget_meta,
        if (layout.showMeta) View.VISIBLE else View.GONE,
      )

      views.setViewVisibility(
        R.id.widget_actions,
        if (layout.showActions) View.VISIBLE else View.GONE,
      )
      views.setTextViewText(
        R.id.widget_action_add_label,
        localizedContext.getString(R.string.quick_add_widget_expense),
      )

      views.setTextViewText(R.id.widget_footnote, footnote)
      views.setViewVisibility(
        R.id.widget_footnote_row,
        if (layout.showFootnote) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_footnote_icon,
        if (needsAttention(snapshot)) View.VISIBLE else View.GONE,
      )

      val contentDescription = listOf(snapshot.contentDescription, footnote)
        .filter { it.isNotBlank() }
        .joinToString(separator = ". ")
      views.setContentDescription(R.id.widget_root, contentDescription)

      views.setOnClickPendingIntent(
        R.id.widget_root,
        openAppIntent(context, appWidgetId),
      )
      views.setOnClickPendingIntent(
        R.id.widget_action_add,
        deepLinkIntent(context, appWidgetId, "budgetapp://add/expense", REQUEST_OFFSET_ADD),
      )
      views.setOnClickPendingIntent(
        R.id.widget_action_refresh,
        deepLinkIntent(context, appWidgetId, "budgetapp://refresh", REQUEST_OFFSET_REFRESH),
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
        val title = setupContext.getString(R.string.budget_widget_setup_title)
        val meta = setupContext.getString(R.string.budget_widget_setup_meta)

        return Snapshot(
          hasData = false,
          language = language,
          title = title,
          value = "—",
          meta = meta,
          statusLabel = "",
          periodLabel = "",
          spentLabel = "",
          spentValue = "",
          budgetLabel = "",
          budgetValue = "",
          percentage = 0,
          tone = "neutral",
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
        value = preferences.getString(KEY_VALUE, "—") ?: "—",
        meta = preferences.getString(KEY_META, "").orEmpty(),
        statusLabel = preferences.getString(KEY_STATUS_LABEL, "").orEmpty(),
        periodLabel = preferences.getString(KEY_PERIOD_LABEL, "").orEmpty(),
        spentLabel = preferences.getString(KEY_SPENT_LABEL, "").orEmpty(),
        spentValue = preferences.getString(KEY_SPENT_VALUE, "").orEmpty(),
        budgetLabel = preferences.getString(KEY_BUDGET_LABEL, "").orEmpty(),
        budgetValue = preferences.getString(KEY_BUDGET_VALUE, "").orEmpty(),
        percentage = preferences.getInt(KEY_PERCENTAGE, 0).coerceIn(0, 100),
        tone = preferences.getString(KEY_TONE, "neutral") ?: "neutral",
        contentDescription = preferences.getString(KEY_CONTENT_DESCRIPTION, title) ?: title,
        isSyncing = preferences.getBoolean(KEY_SYNCING, false),
        isStale = preferences.getBoolean(KEY_STALE, false),
        updatedAt = preferences.getLong(KEY_UPDATED_AT, 0L),
      )
    }

    private fun renderProgress(views: RemoteViews, snapshot: Snapshot) {
      views.setViewVisibility(
        R.id.widget_progress_group,
        if (snapshot.hasData) View.VISIBLE else View.GONE,
      )

      val activeId = when (snapshot.tone) {
        "safe" -> R.id.widget_progress_safe
        "warning" -> R.id.widget_progress_warning
        "danger" -> R.id.widget_progress_danger
        else -> R.id.widget_progress_neutral
      }

      listOf(
        R.id.widget_progress_neutral,
        R.id.widget_progress_safe,
        R.id.widget_progress_warning,
        R.id.widget_progress_danger,
      ).forEach { progressId ->
        views.setViewVisibility(
          progressId,
          if (progressId == activeId) View.VISIBLE else View.GONE,
        )
      }

      views.setProgressBar(activeId, 100, snapshot.percentage, false)
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
        minutes < 60L -> context.getString(
          R.string.budget_widget_updated_minutes,
          minutes.toInt(),
        )
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

      val minutes = (System.currentTimeMillis() - snapshot.updatedAt) / 60_000L
      return minutes >= STALE_AFTER_MINUTES
    }

    private fun badgeBackground(tone: String): Int = when (tone) {
      "safe" -> R.drawable.budget_widget_badge_safe
      "warning" -> R.drawable.budget_widget_badge_warning
      "danger" -> R.drawable.budget_widget_badge_danger
      else -> R.drawable.budget_widget_badge_neutral
    }

    private data class LayoutPlan(
      val showHeader: Boolean,
      val showStatus: Boolean,
      val showBreakdown: Boolean,
      val showMeta: Boolean,
      val showFootnote: Boolean,
      val showActions: Boolean,
    )

    /**
     * Spends the height the launcher reports on the most valuable blocks first, so a resized
     * widget drops detail instead of clipping it.
     */
    private fun resolveLayout(
      height: Int,
      isCompact: Boolean,
      fontScale: Float,
      hasData: Boolean,
      hasStatus: Boolean,
      hasBreakdown: Boolean,
      hasMeta: Boolean,
      hasFootnote: Boolean,
    ): LayoutPlan {
      // Every block is text, so it grows with the system font size (One UI ships large presets).
      fun scaled(value: Int): Int = (value * fontScale).toInt()

      if (!hasData) {
        return resolveEmptyLayout(height, isCompact, fontScale, hasMeta, hasFootnote)
      }

      // The base covers the always-on stack: label, amount and progress bar.
      var available = height - scaled(if (isCompact) BASE_HEIGHT_COMPACT else BASE_HEIGHT)

      // Wide keeps period and badge on a shared row; narrow stacks the badge under the bar.
      val showHeader = !isCompact && available >= scaled(HEADER_HEIGHT)
      if (showHeader) {
        available -= scaled(HEADER_HEIGHT)
      }

      val showStatus = hasStatus &&
        if (isCompact) available >= scaled(STATUS_HEIGHT) else showHeader
      if (showStatus && isCompact) {
        available -= scaled(STATUS_HEIGHT)
      }

      val showBreakdown = hasBreakdown && !isCompact && available >= scaled(BREAKDOWN_HEIGHT)
      if (showBreakdown) {
        available -= scaled(BREAKDOWN_HEIGHT)
      }

      val showFootnote = hasFootnote && available >= scaled(FOOTNOTE_HEIGHT)
      if (showFootnote) {
        available -= scaled(FOOTNOTE_HEIGHT)
      }

      val actionsHeight = scaled(if (isCompact) ACTIONS_HEIGHT_COMPACT else ACTIONS_HEIGHT)

      return LayoutPlan(
        showHeader = showHeader,
        showStatus = showStatus,
        showBreakdown = showBreakdown,
        showMeta = false,
        showFootnote = showFootnote,
        showActions = available >= actionsHeight,
      )
    }

    /** Empty, loading and error states drop the amount and lead with the guidance copy. */
    private fun resolveEmptyLayout(
      height: Int,
      isCompact: Boolean,
      fontScale: Float,
      hasMeta: Boolean,
      hasFootnote: Boolean,
    ): LayoutPlan {
      fun scaled(value: Int): Int = (value * fontScale).toInt()

      var available = height -
        scaled(if (isCompact) EMPTY_BASE_HEIGHT_COMPACT else EMPTY_BASE_HEIGHT)

      val showHeader = !isCompact && available >= scaled(HEADER_HEIGHT)
      if (showHeader) {
        available -= scaled(HEADER_HEIGHT)
      }

      val showMeta = hasMeta && available >= scaled(META_HEIGHT)
      if (showMeta) {
        available -= scaled(META_HEIGHT)
      }

      val showFootnote = hasFootnote && available >= scaled(FOOTNOTE_HEIGHT)
      if (showFootnote) {
        available -= scaled(FOOTNOTE_HEIGHT)
      }

      val actionsHeight = scaled(if (isCompact) ACTIONS_HEIGHT_COMPACT else ACTIONS_HEIGHT)

      return LayoutPlan(
        showHeader = showHeader,
        showStatus = false,
        showBreakdown = false,
        showMeta = showMeta,
        showFootnote = showFootnote,
        showActions = available >= actionsHeight,
      )
    }

    private fun titleTextSize(hasData: Boolean, isCompact: Boolean): Float = when {
      hasData && isCompact -> 11f
      hasData -> 12f
      isCompact -> 13f
      else -> 15f
    }

    /** Keeps long formatted amounts on a single readable line. */
    private fun valueTextSize(
      value: String,
      width: Int,
      isCompact: Boolean,
      fontScale: Float,
    ): Float {
      val base = if (isCompact) 22f else 28f
      val length = value.length.coerceAtLeast(1)
      val available = (width - if (isCompact) 20 else 28).coerceAtLeast(60)
      // Bold digits measure at roughly 0.58em; sp is then multiplied by the user's font scale.
      val fitted = available / (0.58f * length * fontScale)

      return minOf(base, fitted).coerceAtLeast(13f)
    }

    /** The widget follows the language chosen inside the app, not the device locale. */
    private fun localizedContext(context: Context, language: String): Context {
      if (language.isBlank()) {
        return context
      }

      val configuration = Configuration(context.resources.configuration)
      configuration.setLocale(Locale.forLanguageTag(language))
      return context.createConfigurationContext(configuration)
    }

    private fun Context.color(colorId: Int): Int = resources.getColor(colorId, theme)

    private fun openAppIntent(context: Context, appWidgetId: Int): PendingIntent {
      val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }

      return PendingIntent.getActivity(
        context,
        (appWidgetId * 10) + REQUEST_OFFSET_OPEN,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun deepLinkIntent(
      context: Context,
      appWidgetId: Int,
      url: String,
      requestCodeOffset: Int,
    ): PendingIntent {
      val intent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse(url),
        context,
        MainActivity::class.java,
      ).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      }

      return PendingIntent.getActivity(
        context,
        (appWidgetId * 10) + requestCodeOffset,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
