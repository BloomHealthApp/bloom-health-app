package expo.modules.bloomsteps

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

/** Health Connect opens this to explain why the app wants step data. */
class StepsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val padding = (24 * resources.displayMetrics.density).toInt()
    setContentView(TextView(this).apply {
      text = "Bloom Health reads your daily step totals to fill in your Steps habit. Anyone with viewer access to your space can see those totals. Bloom Health doesn't use them for advertising or sell them."
      textSize = 16f
      setPadding(padding, padding, padding, padding)
      fitsSystemWindows = true
    })
  }
}
