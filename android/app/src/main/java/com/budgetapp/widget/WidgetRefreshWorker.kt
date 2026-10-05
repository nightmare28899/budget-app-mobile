package com.budgetapp.widget

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Re-renders widgets from the stored snapshot so time-based labels ("updated 5 min ago",
 * "today") stay accurate while the app is closed. Never touches the network.
 */
class WidgetRefreshWorker(
  context: Context,
  params: WorkerParameters,
) : Worker(context, params) {

  override fun doWork(): Result {
    BudgetWidgetProvider.updateAllWidgets(applicationContext)
    UpcomingPaymentsWidgetProvider.updateAllWidgets(applicationContext)
    return Result.success()
  }

  companion object {
    private const val WORK_NAME = "budgetapp_widget_refresh"

    fun schedule(context: Context) {
      val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(1, TimeUnit.HOURS).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        WORK_NAME,
        ExistingPeriodicWorkPolicy.KEEP,
        request,
      )
    }
  }
}
