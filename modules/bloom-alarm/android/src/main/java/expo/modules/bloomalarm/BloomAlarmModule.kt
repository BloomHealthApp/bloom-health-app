package expo.modules.bloomalarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmInput : Record {
  @Field var id: String = ""
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  @Field var title: String = ""
  @Field var body: String = ""
}

class BloomAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BloomAlarm")

    AsyncFunction("getAvailability") {
      if (AlarmScheduler.canSchedule(context)) "granted" else "needsPermission"
    }

    AsyncFunction("requestPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !AlarmScheduler.canSchedule(context)) {
        openSettings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
      }
    }

    AsyncFunction("canUseFullScreen") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
        context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        openSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
      }
    }

    AsyncFunction("getScheduledIds") {
      AlarmStore.all(context).map { it.id }
    }

    AsyncFunction("schedule") { input: AlarmInput ->
      val alarm = StoredAlarm(input.id, input.hour, input.minute, input.title, input.body)
      AlarmScheduler.schedule(context, alarm)
      AlarmStore.put(context, alarm)
    }

    AsyncFunction("cancel") { id: String ->
      AlarmScheduler.cancel(context, id)
      AlarmStore.remove(context, id)
    }
  }

  private fun openSettings(action: String) {
    context.startActivity(
      Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
  }
}
