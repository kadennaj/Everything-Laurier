import SwiftUI
import MapKit
import CoreLocation
import UIKit

/// Native MapKit screen for an iOS 17+ SwiftUI app. Add the location usage
/// description in Info.plist before presenting it. MapKit owns the GPS feed,
/// blue dot, accuracy circle and native heading cone; no custom pin replaces them.
@MainActor
public struct LiveGPSMapView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var permission = MapLocationPermission()
    @State private var tracking = MKUserTrackingMode.followWithHeading
    @State private var centerRequest = 0

    public init() {}

    public var body: some View {
        NativeGPSMap(
            tracking: $tracking,
            centerRequest: centerRequest,
            active: scenePhase == .active && permission.authorized,
            headingAvailable: permission.headingAvailable
        )
        .ignoresSafeArea(edges: .bottom)
        .overlay(alignment: .bottomTrailing) {
            VStack(alignment: .trailing, spacing: 8) {
                if let message = permission.message {
                    Text(message).font(.caption).padding(10)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
                        .frame(maxWidth: 280)
                }
                HStack(spacing: 12) {
                    Button {
                        permission.request()
                        tracking = .none
                        centerRequest += 1
                    } label: { Label("Centre", systemImage: "location") }
                    .accessibilityValue("Centre once")
                    Button {
                        permission.request()
                        tracking = .follow
                    } label: { Label("Follow", systemImage: "location.fill") }
                    .accessibilityValue(tracking == .follow ? "Following location" : "Not following")
                    Button {
                        permission.request()
                        tracking = .followWithHeading
                    } label: { Label("Heading", systemImage: "location.north.line.fill") }
                    .disabled(!permission.headingAvailable)
                    .accessibilityValue(tracking == .followWithHeading ? "Following heading" : "Not following heading")
                }
                .labelStyle(.iconOnly)
                .buttonStyle(.bordered)
                .tint(.blue)
                .padding(8)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
            }.padding()
        }
        .onAppear { permission.request() }
    }
}

@MainActor
private final class MapLocationPermission: NSObject, ObservableObject, @preconcurrency CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published private(set) var authorized = false
    @Published private(set) var message: String?
    let headingAvailable = CLLocationManager.headingAvailable()

    override init() {
        super.init()
        manager.delegate = self
    }

    func request() {
        guard Bundle.main.object(forInfoDictionaryKey: "NSLocationWhenInUseUsageDescription") != nil else {
            message = "Location access is not configured for this app build."
            return
        }
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else {
            locationManagerDidChangeAuthorization(manager)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            authorized = true
            message = headingAvailable ? nil : "Compass unavailable. Location follow is available."
        case .denied, .restricted:
            authorized = false
            message = "Allow location access in Settings to show your position."
        case .notDetermined:
            authorized = false
            message = "Allow location access to centre the map on you."
        @unknown default:
            authorized = false
            message = "Location access is unavailable."
        }
    }
}

@MainActor
private struct NativeGPSMap: UIViewRepresentable {
    @Binding var tracking: MKUserTrackingMode
    let centerRequest: Int
    let active: Bool
    let headingAvailable: Bool

    func makeCoordinator() -> Coordinator { Coordinator(tracking: $tracking) }

    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView()
        map.delegate = context.coordinator
        map.showsCompass = true
        map.showsScale = true
        map.isRotateEnabled = true
        map.isPitchEnabled = true
        return map
    }

    func updateUIView(_ map: MKMapView, context: Context) {
        let coordinator = context.coordinator
        coordinator.tracking = $tracking
        let mode: MKUserTrackingMode = !active ? .none
            : tracking == .followWithHeading && !headingAvailable ? .follow : tracking
        let activeChanged = coordinator.active != active
        coordinator.active = active
        map.showsUserLocation = active
        // Set tracking only for a user selection or lifecycle change. Reapplying
        // it on every SwiftUI update would snap the map back after a pan gesture.
        if activeChanged || coordinator.lastRequestedMode != mode {
            coordinator.lastRequestedMode = mode
            coordinator.applyingMode = true
            map.setUserTrackingMode(mode, animated: true)
            coordinator.applyingMode = false
        }
        if coordinator.lastCenterRequest != centerRequest {
            coordinator.lastCenterRequest = centerRequest
            coordinator.pendingCenter = true
        }
        if active { coordinator.centerIfReady(map) }
    }

    static func dismantleUIView(_ map: MKMapView, coordinator: Coordinator) {
        map.delegate = nil
        map.setUserTrackingMode(.none, animated: false)
        map.showsUserLocation = false
    }

    @MainActor
    final class Coordinator: NSObject, MKMapViewDelegate {
        var tracking: Binding<MKUserTrackingMode>
        var active = false
        var applyingMode = false
        var lastRequestedMode: MKUserTrackingMode?
        var lastCenterRequest = 0
        var pendingCenter = false

        init(tracking: Binding<MKUserTrackingMode>) { self.tracking = tracking }

        func centerIfReady(_ map: MKMapView) {
            guard pendingCenter, active, let fix = map.userLocation.location,
                  fix.horizontalAccuracy >= 0, abs(fix.timestamp.timeIntervalSinceNow) < 30 else { return }
            pendingCenter = false
            map.setCenter(fix.coordinate, animated: true)
        }

        func mapView(_ map: MKMapView, didUpdate userLocation: MKUserLocation) {
            centerIfReady(map)
        }

        func mapView(_ map: MKMapView, didChange mode: MKUserTrackingMode, animated: Bool) {
            guard active, !applyingMode else { return }
            // Native gestures disable tracking. Defer the SwiftUI binding update
            // and discard it if a newer button selection changed the map mode.
            Task { @MainActor [weak map, weak self] in
                guard let self, map?.userTrackingMode == mode else { return }
                self.tracking.wrappedValue = mode
            }
        }

        func mapView(_ map: MKMapView, viewFor annotation: any MKAnnotation) -> MKAnnotationView? {
            // nil preserves Apple's native user annotation. followWithHeading
            // enables its system heading indicator on a compass-equipped device.
            return nil
        }
    }
}
