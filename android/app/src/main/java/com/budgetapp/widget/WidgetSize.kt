package com.budgetapp.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.SizeF

/**
 * The size, in dp, a widget actually occupies right now.
 *
 * The options bundle describes a range, not a size: in portrait the widget is
 * [OPTION_APPWIDGET_MIN_WIDTH] wide and [OPTION_APPWIDGET_MAX_HEIGHT] tall, and the other
 * way round in landscape. Reading `minHeight` alone (the landscape bound) under-reports the
 * portrait height by a whole row on launchers such as One UI, which then hides detail that
 * would have fitted.
 */
internal data class WidgetSize(
  val width: Int,
  val height: Int,
) {
  companion object {
    private const val FALLBACK_WIDTH = 250
    private const val FALLBACK_HEIGHT = 180

    fun of(
      context: Context,
      manager: AppWidgetManager,
      appWidgetId: Int,
    ): WidgetSize {
      val options = manager.getAppWidgetOptions(appWidgetId)
      val isPortrait = context.resources.configuration.orientation !=
        Configuration.ORIENTATION_LANDSCAPE

      return exactSize(options, isPortrait) ?: boundsSize(options, isPortrait)
    }

    /** Android 12+ reports the exact sizes the launcher lays the widget out at. */
    private fun exactSize(options: Bundle, isPortrait: Boolean): WidgetSize? {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        return null
      }

      @Suppress("DEPRECATION")
      val sizes = options
        .getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
        ?.filter { it.width > 0f && it.height > 0f }

      if (sizes.isNullOrEmpty()) {
        return null
      }

      // The portrait entry is the narrow, tall one.
      val size = if (isPortrait) {
        sizes.minByOrNull { it.width }
      } else {
        sizes.maxByOrNull { it.width }
      } ?: return null

      return WidgetSize(size.width.toInt(), size.height.toInt())
    }

    private fun boundsSize(options: Bundle, isPortrait: Boolean): WidgetSize {
      val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
      val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
      val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
      val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)

      val width = if (isPortrait) minWidth else maxWidth.orIfZero(minWidth)
      val height = if (isPortrait) maxHeight.orIfZero(minHeight) else minHeight

      return WidgetSize(
        width = width.orIfZero(FALLBACK_WIDTH),
        height = height.orIfZero(FALLBACK_HEIGHT),
      )
    }

    private fun Int.orIfZero(fallback: Int): Int = if (this > 0) this else fallback
  }
}
