package zw.gov.bcc.bcc_smartconnect

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.android.RenderMode
import io.flutter.embedding.engine.FlutterShellArgs
import android.content.pm.ApplicationInfo

class MainActivity : FlutterActivity() {
	override fun getRenderMode(): RenderMode = RenderMode.texture

	override fun getFlutterShellArgs(): FlutterShellArgs {
		val args = super.getFlutterShellArgs()
		val isDebuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
		if (isDebuggable) {
			args.add(FlutterShellArgs.ARG_ENABLE_SOFTWARE_RENDERING)
			args.add(FlutterShellArgs.ARG_DISABLE_IMPELLER)
		}
		return args
	}
}
