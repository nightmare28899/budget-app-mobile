package com.budgetapp.liveupdates

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import com.budgetapp.MainActivity
import com.budgetapp.R
import java.text.NumberFormat
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Currency
import java.util.concurrent.ConcurrentHashMap

/**
 * Builds the Android 16 "Live Update" (promoted ongoing) notifications.
 *
 * API 36+: [Notification.ProgressStyle] + the promoted-ongoing request extra.
 * API < 36: a plain ongoing progress notification.
 */
object LiveUpdatesNotifier {
  const val CHANNEL_STATEMENT_IMPORT = "budgetapp_statement_import"
  const val CHANNEL_PAYMENT_DUE = "budgetapp_payment_due"

  private const val TAG_IMPORT = "statement-import:"
  private const val TAG_DUE = "payment-due:"
  private const val NOTIFICATION_ID = 4101
  private const val API_LIVE_UPDATES = 36

  // Same string as Notification.EXTRA_REQUEST_PROMOTED_ONGOING. The android-36 SDK
  // jar has no Builder#setRequestPromotedOngoing (only setShortCriticalText), so the
  // request flag is written through extras, which is what that setter does.
  private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

  private const val SEGMENT_LENGTH = 100
  private const val STAGE_COUNT = 3

  private val labels = ConcurrentHashMap<String, String>()

  enum class Stage {
    UPLOADING,
    PARSING,
    REVIEW,
    DONE,
    FAILED,
    ;

    companion object {
      fun from(value: String): Stage? = entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
    }
  }

  fun isPromotedSupported(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < API_LIVE_UPDATES) return false
    return manager(context)?.canPostPromotedNotifications() == true
  }

  fun ensureChannels(context: Context) {
    val manager = manager(context) ?: return
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_STATEMENT_IMPORT,
        context.getString(R.string.live_channel_import_name),
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = context.getString(R.string.live_channel_import_description)
        setSound(null, null)
        enableVibration(false)
      },
    )
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_PAYMENT_DUE,
        context.getString(R.string.live_channel_due_name),
        NotificationManager.IMPORTANCE_HIGH,
      ).apply { description = context.getString(R.string.live_channel_due_description) },
    )
  }

  private fun manager(context: Context): NotificationManager? =
    context.getSystemService(NotificationManager::class.java)

  private fun canNotify(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return false
    }
    return manager(context)?.areNotificationsEnabled() == true
  }

  fun startImport(context: Context, importId: String, label: String) {
    labels[importId] = label
    postImport(context, importId, Stage.UPLOADING, 0.0, null)
  }

  fun updateImport(
    context: Context,
    importId: String,
    stage: Stage,
    progress: Double?,
    statementId: String?,
  ) {
    postImport(context, importId, stage, progress, statementId)
  }

  fun endImport(context: Context, importId: String) {
    labels.remove(importId)
    manager(context)?.cancel(TAG_IMPORT + importId, NOTIFICATION_ID)
  }

  private fun postImport(
    context: Context,
    importId: String,
    stage: Stage,
    progress: Double?,
    statementId: String?,
  ) {
    if (!canNotify(context)) return
    ensureChannels(context)

    val fraction = (progress ?: 0.0).coerceIn(0.0, 1.0)
    val ongoing = stage == Stage.UPLOADING || stage == Stage.PARSING
    val title = labels[importId] ?: context.getString(R.string.live_import_default_title)
    val text = when (stage) {
      Stage.UPLOADING -> context.getString(R.string.live_import_uploading)
      Stage.PARSING -> context.getString(R.string.live_import_parsing)
      Stage.REVIEW -> context.getString(R.string.live_import_review)
      Stage.DONE -> context.getString(R.string.live_import_done)
      Stage.FAILED -> context.getString(R.string.live_import_failed)
    }

    val builder = Notification.Builder(context, CHANNEL_STATEMENT_IMPORT)
      .setSmallIcon(R.drawable.ic_stat_live_update)
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(Notification.CATEGORY_PROGRESS)
      .setOnlyAlertOnce(true)
      .setOngoing(ongoing)
      .setAutoCancel(!ongoing)
      .setContentIntent(
        deepLinkIntent(context, statementId?.let { "budgetapp://statements/$it" }, importId.hashCode()),
      )

    if (Build.VERSION.SDK_INT >= API_LIVE_UPDATES) {
      builder.setStyle(progressStyle(stage, fraction))
      if (ongoing) {
        builder.addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
        if (stage == Stage.UPLOADING) {
          builder.setShortCriticalText("${(fraction * 100).toInt()}%")
        }
      }
    } else if (ongoing) {
      // Parsing time is unknown, so only the upload leg has a determinate bar.
      builder.setProgress(100, (fraction * 100).toInt(), stage == Stage.PARSING)
    }

    manager(context)?.notify(TAG_IMPORT + importId, NOTIFICATION_ID, builder.build())
  }

  /** Three segments (upload, parse, review) with points on the stage boundaries. */
  private fun progressStyle(stage: Stage, fraction: Double): Notification.ProgressStyle {
    val position = when (stage) {
      Stage.UPLOADING -> (fraction * SEGMENT_LENGTH).toInt()
      Stage.PARSING -> SEGMENT_LENGTH + SEGMENT_LENGTH / 2
      Stage.REVIEW -> SEGMENT_LENGTH * 2 + SEGMENT_LENGTH / 2
      Stage.DONE -> SEGMENT_LENGTH * STAGE_COUNT
      Stage.FAILED -> 0
    }
    return Notification.ProgressStyle()
      .setStyledByProgress(true)
      .setProgressSegments(
        List(STAGE_COUNT) { Notification.ProgressStyle.Segment(SEGMENT_LENGTH) },
      )
      .setProgressPoints(
        listOf(
          Notification.ProgressStyle.Point(SEGMENT_LENGTH),
          Notification.ProgressStyle.Point(SEGMENT_LENGTH * 2),
        ),
      )
      .setProgress(position)
  }

  fun showPaymentDue(
    context: Context,
    cardId: String,
    cardName: String,
    amount: Double,
    dueDate: String,
    currency: String?,
  ) {
    if (!canNotify(context)) return
    ensureChannels(context)

    val days = runCatching {
      ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(dueDate.take(10)))
    }.getOrNull() ?: return
    if (days < 0) return

    val short = when (days) {
      0L -> context.getString(R.string.live_due_short_today)
      1L -> context.getString(R.string.live_due_short_tomorrow)
      else -> context.getString(R.string.live_due_short_days, days.toInt())
    }

    val builder = Notification.Builder(context, CHANNEL_PAYMENT_DUE)
      .setSmallIcon(R.drawable.ic_stat_live_update)
      .setContentTitle(context.getString(R.string.live_due_title, cardName))
      .setContentText(context.getString(R.string.live_due_text, formatAmount(amount, currency), short))
      .setCategory(Notification.CATEGORY_REMINDER)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setContentIntent(deepLinkIntent(context, null, cardId.hashCode()))

    if (Build.VERSION.SDK_INT >= API_LIVE_UPDATES) {
      builder.addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
      builder.setShortCriticalText(short)
    }

    manager(context)?.notify(TAG_DUE + cardId, NOTIFICATION_ID, builder.build())
  }

  fun clearPaymentDue(context: Context, cardId: String) {
    manager(context)?.cancel(TAG_DUE + cardId, NOTIFICATION_ID)
  }

  private fun formatAmount(amount: Double, currency: String?): String = runCatching {
    NumberFormat.getCurrencyInstance().apply {
      if (!currency.isNullOrBlank()) this.currency = Currency.getInstance(currency.uppercase())
    }.format(amount)
  }.getOrElse { amount.toString() }

  /** Deep link to [uri] through MainActivity, or the plain launcher when [uri] is null. */
  private fun deepLinkIntent(context: Context, uri: String?, requestCode: Int): PendingIntent {
    val intent = if (uri != null) {
      Intent(Intent.ACTION_VIEW, Uri.parse(uri), context, MainActivity::class.java)
    } else {
      Intent(context, MainActivity::class.java).setAction(Intent.ACTION_MAIN)
    }.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
