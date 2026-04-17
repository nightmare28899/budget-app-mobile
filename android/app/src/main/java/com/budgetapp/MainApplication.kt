package com.budgetapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Application
import android.os.Build
import androidx.core.content.getSystemService
import com.budgetapp.security.BudgetAppSecureKeyStorePackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(BudgetAppSecureKeyStorePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    ensureDefaultNotificationChannel()
    loadReactNative(this)
  }

  private fun ensureDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService<NotificationManager>() ?: return
    val channelId = getString(R.string.default_notification_channel_id)
    if (manager.getNotificationChannel(channelId) != null) {
      return
    }

    val channelName = getString(R.string.default_notification_channel_name)
    val channel = NotificationChannel(
      channelId,
      channelName,
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = channelName
      enableVibration(true)
    }

    manager.createNotificationChannel(channel)
  }
}
