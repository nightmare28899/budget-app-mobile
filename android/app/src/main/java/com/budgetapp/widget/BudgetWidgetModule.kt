package com.budgetapp.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class BudgetWidgetModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun updateSnapshot(snapshot: ReadableMap) {
    val incomingState = snapshot.stringValue(BudgetWidgetProvider.KEY_STATE) ?: return
    val preferences = reactApplicationContext.getSharedPreferences(
      BudgetWidgetProvider.PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    )
    val currentState = preferences.getString(BudgetWidgetProvider.KEY_STATE, null)

    // Never trade a usable summary for a spinner or an error: keep the numbers and
    // annotate them instead, so the widget always shows the last known truth.
    if ((incomingState == "loading" || incomingState == "error") && currentState == "data") {
      preferences.edit()
        .putBoolean(BudgetWidgetProvider.KEY_SYNCING, incomingState == "loading")
        .putBoolean(BudgetWidgetProvider.KEY_STALE, incomingState == "error")
        .apply()
      BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
      return
    }

    val editor = preferences.edit()
      .putString(BudgetWidgetProvider.KEY_STATE, incomingState)
      .putString(
        BudgetWidgetProvider.KEY_LANGUAGE,
        snapshot.stringValue(BudgetWidgetProvider.KEY_LANGUAGE).orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_TITLE,
        snapshot.stringValue(BudgetWidgetProvider.KEY_TITLE).orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_VALUE,
        snapshot.stringValue(BudgetWidgetProvider.KEY_VALUE).orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_META,
        snapshot.stringValue(BudgetWidgetProvider.KEY_META).orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_STATUS_LABEL,
        snapshot.stringValue("statusLabel").orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_PERIOD_LABEL,
        snapshot.stringValue("periodLabel").orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_SPENT_LABEL,
        snapshot.stringValue("spentLabel").orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_SPENT_VALUE,
        snapshot.stringValue("spentValue").orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_BUDGET_LABEL,
        snapshot.stringValue("budgetLabel").orEmpty(),
      )
      .putString(
        BudgetWidgetProvider.KEY_BUDGET_VALUE,
        snapshot.stringValue("budgetValue").orEmpty(),
      )
      .putInt(
        BudgetWidgetProvider.KEY_PERCENTAGE,
        snapshot.intValue(BudgetWidgetProvider.KEY_PERCENTAGE),
      )
      .putString(
        BudgetWidgetProvider.KEY_TONE,
        snapshot.stringValue(BudgetWidgetProvider.KEY_TONE) ?: "neutral",
      )
      .putString(
        BudgetWidgetProvider.KEY_CONTENT_DESCRIPTION,
        snapshot.stringValue("contentDescription").orEmpty(),
      )
      .putBoolean(
        BudgetWidgetProvider.KEY_SYNCING,
        snapshot.booleanValue("isSyncing"),
      )
      .putBoolean(BudgetWidgetProvider.KEY_STALE, false)

    // Freshness is measured on the device clock the widget renders with.
    if (incomingState == "data") {
      editor.putLong(BudgetWidgetProvider.KEY_UPDATED_AT, System.currentTimeMillis())
    } else {
      editor.putLong(BudgetWidgetProvider.KEY_UPDATED_AT, 0L)
    }

    editor.apply()

    BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
  }

  @ReactMethod
  fun updateUpcomingSnapshot(snapshot: ReadableMap) {
    val incomingState = snapshot.stringValue(UpcomingPaymentsWidgetProvider.KEY_STATE) ?: return
    val preferences = reactApplicationContext.getSharedPreferences(
      UpcomingPaymentsWidgetProvider.PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    )
    val currentState = preferences.getString(UpcomingPaymentsWidgetProvider.KEY_STATE, null)

    // Keep the last usable schedule visible while a refresh is running or temporarily fails.
    if ((incomingState == "loading" || incomingState == "error") && currentState == "data") {
      preferences.edit()
        .putBoolean(
          UpcomingPaymentsWidgetProvider.KEY_SYNCING,
          incomingState == "loading",
        )
        .putBoolean(
          UpcomingPaymentsWidgetProvider.KEY_STALE,
          incomingState == "error",
        )
        .apply()
      UpcomingPaymentsWidgetProvider.updateAllWidgets(reactApplicationContext)
      return
    }

    val editor = preferences.edit()
      .putString(UpcomingPaymentsWidgetProvider.KEY_STATE, incomingState)
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_LANGUAGE,
        snapshot.stringValue(UpcomingPaymentsWidgetProvider.KEY_LANGUAGE).orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_TITLE,
        snapshot.stringValue(UpcomingPaymentsWidgetProvider.KEY_TITLE).orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_NEXT_NAME,
        snapshot.stringValue("nextName").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_NEXT_AMOUNT,
        snapshot.stringValue("nextAmount").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_NEXT_TIMING,
        snapshot.stringValue("nextTiming").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_COUNT_LABEL,
        snapshot.stringValue("countLabel").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_TOTAL_LABEL,
        snapshot.stringValue("totalLabel").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_TOTAL_VALUE,
        snapshot.stringValue("totalValue").orEmpty(),
      )
      .putString(
        UpcomingPaymentsWidgetProvider.KEY_CONTENT_DESCRIPTION,
        snapshot.stringValue("contentDescription").orEmpty(),
      )
      .putBoolean(
        UpcomingPaymentsWidgetProvider.KEY_SYNCING,
        snapshot.booleanValue("isSyncing"),
      )
      .putBoolean(UpcomingPaymentsWidgetProvider.KEY_STALE, false)

    if (incomingState == "data") {
      editor.putLong(
        UpcomingPaymentsWidgetProvider.KEY_UPDATED_AT,
        System.currentTimeMillis(),
      )
    } else {
      editor.putLong(UpcomingPaymentsWidgetProvider.KEY_UPDATED_AT, 0L)
    }

    editor.apply()
    UpcomingPaymentsWidgetProvider.updateAllWidgets(reactApplicationContext)
  }

  @ReactMethod
  fun clearSnapshot() {
    reactApplicationContext
      .getSharedPreferences(BudgetWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .clear()
      .apply()
    reactApplicationContext
      .getSharedPreferences(
        UpcomingPaymentsWidgetProvider.PREFERENCES_NAME,
        Context.MODE_PRIVATE,
      )
      .edit()
      .clear()
      .apply()
    BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
    UpcomingPaymentsWidgetProvider.updateAllWidgets(reactApplicationContext)
  }

  private fun ReadableMap.stringValue(key: String): String? {
    return if (hasKey(key) && !isNull(key)) getString(key) else null
  }

  private fun ReadableMap.intValue(key: String): Int {
    return if (hasKey(key) && !isNull(key)) getDouble(key).toInt().coerceIn(0, 100) else 0
  }

  private fun ReadableMap.booleanValue(key: String): Boolean {
    return hasKey(key) && !isNull(key) && getBoolean(key)
  }

  companion object {
    private const val MODULE_NAME = "BudgetWidget"
  }
}
