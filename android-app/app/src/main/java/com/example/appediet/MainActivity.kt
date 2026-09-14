package com.example.appediet

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.*
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    // Broadcast receiver for live hardware step updates from StepCounterService
    private val stepReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val steps = intent?.getIntExtra(StepCounterService.EXTRA_STEPS, 0) ?: 0
            pushStepsToWebView(steps)
        }
    }

    // Modern Android runtime permission launcher
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val activityGranted = permissions[Manifest.permission.ACTIVITY_RECOGNITION] ?: true
        if (activityGranted) {
            startTrackingService()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadsImagesAutomatically = true
                mediaPlaybackRequiresUserGesture = false
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
            }

            // Expose native step tracking bridge to JavaScript
            addJavascriptInterface(AndroidStepBridge(), "AndroidStepBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    // Keep internal local navigation inside WebView
                    if (url.startsWith("file://") || url.contains("localhost") || url.contains("192.168.") || url.contains("trycloudflare.com")) {
                        return false
                    }
                    // External links open in browser
                    return try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        context.startActivity(intent)
                        true
                    } catch (e: Exception) {
                        false
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // Push initial saved steps immediately upon page load
                    val initialSteps = StepCounterService.getSavedTodaySteps(this@MainActivity)
                    pushStepsToWebView(initialSteps)
                }
            }

            webChromeClient = object : WebChromeClient() {
                // Support camera & file uploads
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback

                    return try {
                        val intent = fileChooserParams?.createIntent()
                        if (intent != null) {
                            startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                            true
                        } else {
                            false
                        }
                    } catch (e: Exception) {
                        fileChooserCallback = null
                        false
                    }
                }

                // Grant camera / microphone permissions for web scanner
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.grant(request.resources)
                }
            }

            // Load bundled offline Appediet application
            loadUrl("file:///android_asset/www/index.html")
        }

        setContentView(webView)

        // Handle Android Back Navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Check & request step tracking permissions on startup
        checkAndRequestPermissions()
    }

    fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.ACTIVITY_RECOGNITION)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        } else {
            startTrackingService()
        }
    }

    private fun startTrackingService() {
        try {
            val intent = Intent(this, StepCounterService::class.java)
            ContextCompat.startForegroundService(this, intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun pushStepsToWebView(steps: Int) {
        webView.post {
            val js = "if (window.onStepCountUpdate) { window.onStepCountUpdate($steps); }"
            webView.evaluateJavascript(js, null)
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(StepCounterService.ACTION_STEP_UPDATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stepReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stepReceiver, filter)
        }

        // Sync steps on resume
        val steps = StepCounterService.getSavedTodaySteps(this)
        pushStepsToWebView(steps)
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(stepReceiver)
        } catch (e: Exception) {
            // Ignored
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            fileChooserCallback?.onReceiveValue(results)
            fileChooserCallback = null
        }
    }

    /**
     * JavaScript Bridge Interface: allows HTML/JS frontend to query native hardware step counter state
     */
    inner class AndroidStepBridge {
        @JavascriptInterface
        fun getTodaySteps(): Int {
            return StepCounterService.getSavedTodaySteps(this@MainActivity)
        }

        @JavascriptInterface
        fun isHardwareSensorAvailable(): Boolean {
            val sm = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            return sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
        }

        @JavascriptInterface
        fun requestStepPermissions() {
            runOnUiThread {
                checkAndRequestPermissions()
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return true
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
    }
}
