package expo.modules.bloomalarm

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.lang.ref.WeakReference

/** Shown over the lock screen while an alarm rings. Native, because React Native may not be running. */
class AlarmActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    current = WeakReference(this)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    val gap = (24 * resources.displayMetrics.density).toInt()
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(gap, gap, gap, gap)
      setBackgroundColor(Color.parseColor("#FFF9F5"))
    }
    root.addView(TextView(this).apply {
      text = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE)
      textSize = 34f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#2B2024"))
    })
    root.addView(TextView(this).apply {
      text = intent.getStringExtra(AlarmScheduler.EXTRA_BODY)
      textSize = 18f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#2B2024"))
      setPadding(0, gap / 2, 0, gap * 2)
    })
    root.addView(button("Dismiss", AlarmRingService.ACTION_DISMISS, Color.parseColor("#D65B98"), Color.WHITE))
    root.addView(button("Snooze 10 min", AlarmRingService.ACTION_SNOOZE, Color.TRANSPARENT, Color.parseColor("#2B2024")))
    setContentView(root)
  }

  override fun onDestroy() {
    if (current?.get() === this) current = null
    super.onDestroy()
  }

  private fun button(label: String, action: String, background: Int, foreground: Int) = Button(this).apply {
    text = label
    textSize = 18f
    setTextColor(foreground)
    setBackgroundColor(background)
    minimumHeight = (56 * resources.displayMetrics.density).toInt()
    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    setOnClickListener {
      startService(AlarmRingService.command(this@AlarmActivity, action))
      finish()
    }
  }

  companion object {
    private var current: WeakReference<AlarmActivity>? = null

    fun closeCurrent() {
      current?.get()?.finish()
    }
  }
}
