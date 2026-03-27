import UIKit
import Capacitor
import CoreMotion

private enum NativeMotionPermissionState: String {
    case notDetermined
    case granted
    case denied
    case unsupported
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // 应用启动后的自定义初始化入口。
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // 应用即将从活跃态切到非活跃态时，在这里暂停即时任务。
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // 应用进入后台时，在这里释放共享资源或保存必要状态。
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // 应用即将回到前台时，在这里恢复前台展示前的状态。
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // 应用重新活跃后，在这里恢复暂停中的任务。
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // 应用终止前，在这里补充持久化清理逻辑。
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        // 应用通过 URL 启动时，继续交给 Capacitor 代理处理。
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        // 应用通过通用链接或系统活动恢复时，继续交给 Capacitor 代理处理。
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }
}

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeMotionPlugin())
    }
}

@objc(NativeMotionPlugin)
class NativeMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMotion"
    public let jsName = "NativeMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recenter", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    private let motionManager = CMMotionManager()
    private let activityManager = CMMotionActivityManager()
    private let motionQueue = OperationQueue.main
    private var pendingStartCall: CAPPluginCall?
    private var startTimeoutWorkItem: DispatchWorkItem?
    private var hasDeliveredSample = false

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "status": currentStatus().rawValue
        ])
    }

    @objc func start(_ call: CAPPluginCall) {
        guard motionManager.isDeviceMotionAvailable else {
            call.resolve([
                "status": NativeMotionPermissionState.unsupported.rawValue,
                "started": false
            ])
            return
        }

        requestMotionAuthorizationIfNeeded()

        if motionManager.isDeviceMotionActive {
            let status = currentStatus()
            call.resolve([
                "status": status.rawValue,
                "started": status == .granted
            ])
            return
        }

        if let previousCall = pendingStartCall {
            previousCall.resolve([
                "status": currentStatus().rawValue,
                "started": motionManager.isDeviceMotionActive
            ])
            bridge?.releaseCall(previousCall)
        }

        pendingStartCall = call
        bridge?.saveCall(call)
        startTimeoutWorkItem?.cancel()
        hasDeliveredSample = false
        motionManager.deviceMotionUpdateInterval = 1.0 / 60.0

        motionManager.startDeviceMotionUpdates(
            using: .xArbitraryCorrectedZVertical,
            to: motionQueue
        ) { [weak self] motion, error in
            guard let self else {
                return
            }

            if error != nil {
                self.resolveStartIfNeeded(status: self.currentStatus())
                return
            }

            guard let motion else {
                return
            }

            self.hasDeliveredSample = true
            self.activityManager.stopActivityUpdates()
            self.notifyListeners("motionSample", data: self.makeSamplePayload(from: motion))
            self.resolveStartIfNeeded(status: .granted)
        }

        let timeoutWorkItem = DispatchWorkItem { [weak self] in
            guard let self else {
                return
            }

            let status = self.currentStatus()
            if status != .granted {
                self.stopMotionUpdates()
            }
            self.resolveStartIfNeeded(status: status)
        }

        startTimeoutWorkItem = timeoutWorkItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: timeoutWorkItem)
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopMotionUpdates()
        call.resolve()
    }

    @objc func recenter(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else {
            call.reject("无法打开系统设置")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(settingsURL, options: [:]) { success in
                if success {
                    call.resolve()
                    return
                }

                call.reject("打开系统设置失败")
            }
        }
    }

    deinit {
        stopMotionUpdates()
    }

    private func requestMotionAuthorizationIfNeeded() {
        guard CMMotionActivityManager.isActivityAvailable() else {
            return
        }

        if #available(iOS 11.0, *) {
            if CMMotionActivityManager.authorizationStatus() != .notDetermined {
                return
            }
        }

        activityManager.startActivityUpdates(to: motionQueue) { _ in }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            self?.activityManager.stopActivityUpdates()
        }
    }

    private func stopMotionUpdates() {
        startTimeoutWorkItem?.cancel()
        startTimeoutWorkItem = nil
        motionManager.stopDeviceMotionUpdates()
        activityManager.stopActivityUpdates()
    }

    private func resolveStartIfNeeded(status: NativeMotionPermissionState) {
        startTimeoutWorkItem?.cancel()
        startTimeoutWorkItem = nil

        guard let call = pendingStartCall else {
            return
        }

        call.resolve([
            "status": status.rawValue,
            "started": status == .granted
        ])
        bridge?.releaseCall(call)
        pendingStartCall = nil
    }

    private func currentStatus() -> NativeMotionPermissionState {
        if !motionManager.isDeviceMotionAvailable {
            return .unsupported
        }

        let authorizationStatus = currentAuthorizationStatus()
        if authorizationStatus == .denied {
            return .denied
        }

        if authorizationStatus == .granted || hasDeliveredSample || motionManager.isDeviceMotionActive {
            return .granted
        }

        return .notDetermined
    }

    private func currentAuthorizationStatus() -> NativeMotionPermissionState {
        if #available(iOS 11.0, *) {
            switch CMMotionActivityManager.authorizationStatus() {
            case .authorized:
                return .granted
            case .denied, .restricted:
                return .denied
            case .notDetermined:
                return .notDetermined
            @unknown default:
                return .notDetermined
            }
        }

        return .notDetermined
    }

    private func makeSamplePayload(from motion: CMDeviceMotion) -> [String: Any] {
        let gravity = motion.gravity

        return [
            "accelerationIncludingGravity": [
                "x": gravity.x * 9.81,
                "y": gravity.y * 9.81,
                "z": gravity.z * 9.81
            ],
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ]
    }
}
