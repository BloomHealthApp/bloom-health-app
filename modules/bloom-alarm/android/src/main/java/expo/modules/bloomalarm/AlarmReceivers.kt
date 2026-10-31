package expo.modules.bloomalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmFireReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
    // setAlarmClock fires once, so the next day has to be booked here. A snooze ring leaves the daily schedule alone.
    val isDaily = intent.data?.host == "fire"
    val stored = AlarmStore.get(context, id)
    if (isDaily) {
      if (stored == null) return
      try {
        AlarmScheduler.schedule(context, stored)
      } catch (e: SecurityException) {
        Log.w("BloomAlarm", "Could not schedule the next alarm", e)
      }
    }
    val ring = Intent(context, AlarmRingService::class.java)
      .setAction(AlarmRingService.ACTION_RING)
      .putExtra(AlarmScheduler.EXTRA_ID, id)
      .putExtra(AlarmScheduler.EXTRA_TITLE, stored?.title ?: intent.getStringExtra(AlarmScheduler.EXTRA_TITLE).orEmpty())
      .putExtra(AlarmScheduler.EXTRA_BODY, stored?.body ?: intent.getStringExtra(AlarmScheduler.EXTRA_BODY).orEmpty())
      .putExtra(AlarmScheduler.EXTRA_VOLUME, stored?.volume ?: intent.getDoubleExtra(AlarmScheduler.EXTRA_VOLUME, 1.0))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(ring) else context.startService(ring)
  }
}

class AlarmRestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      AlarmScheduler.restoreAll(context)
    } catch (e: SecurityException) {
      Log.w("BloomAlarm", "Could not restore alarms", e)
    }
  }
}
