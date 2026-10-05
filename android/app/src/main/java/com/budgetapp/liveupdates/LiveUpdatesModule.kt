package com.budgetapp.liveupdates

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** RN bridge for Android 16 Live Updates. Every method is a safe no-op when notifications are off. */
class LiveUpdatesModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun isPromotedSupported(promise: Promise) {
    promise.resolve(LiveUpdatesNotifier.isPromotedSupported(reactApplicationContext))
  }

  @ReactMethod
  fun startStatementImport(importId: String, label: String) = safely {
    LiveUpdatesNotifier.startImport(reactApplicationContext, importId, label)
  }

  @ReactMethod
  fun updateStatementImport(importId: String, stage: String, progress: Double, statementId: String?) = safely {
    val parsed = LiveUpdatesNotifier.Stage.from(stage) ?: return@safely
    // NaN marks "no progress value" so the JS bridge needs no nullable number.
    LiveUpdatesNotifier.updateImport(
      reactApplicationContext,
      importId,
      parsed,
      progress.takeUnless { it.isNaN() },
      statementId?.takeIf { it.isNotBlank() },
    )
  }

  @ReactMethod
  fun endStatementImport(importId: String) = safely {
    LiveUpdatesNotifier.endImport(reactApplicationContext, importId)
  }

  @ReactMethod
  fun showPaymentDue(cardId: String, cardName: String, amount: Double, dueDate: String, currency: String?) = safely {
    LiveUpdatesNotifier.showPaymentDue(reactApplicationContext, cardId, cardName, amount, dueDate, currency)
  }

  @ReactMethod
  fun clearPaymentDue(cardId: String) = safely {
    LiveUpdatesNotifier.clearPaymentDue(reactApplicationContext, cardId)
  }

  // A notification failure must never crash the import or dashboard flow.
  private inline fun safely(block: () -> Unit) {
    runCatching(block)
  }

  companion object {
    const val MODULE_NAME = "BudgetLiveUpdates"
  }
}
