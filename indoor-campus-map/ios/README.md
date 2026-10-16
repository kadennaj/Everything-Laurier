# Native live GPS screen

Add `LiveGPSMapView.swift` to your iOS 17+ app target and present `LiveGPSMapView()` in SwiftUI. This is a prepared component; it has not been installed in a separate app project. The browser prototype continues to use its own Three.js map and browser sensor APIs.

Add **Privacy – Location When In Use Usage Description** to your target's Info settings:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your location helps you follow the campus map and find walking directions.</string>
```

`MKMapView.showsUserLocation` displays Apple's native blue dot and accuracy circle. The default `.followWithHeading` mode centres on the live location and enables MapKit's native compass-facing indicator and map rotation. The **Centre**, **Follow**, and **Heading** controls select one-time centring, continuous location follow, or heading follow. Panning updates the selected tracking mode rather than being overridden at the next SwiftUI update. The view pauses user-location display when inactive and removes it when dismantled. Location is not stored or uploaded by this component.

MapKit's native heading information is supplied in heading-follow mode; the iOS SDK has no public `MKUserLocationView.showsHeading` switch. This component uses public tracking APIs and keeps the default user annotation. It does not draw a fake native heading wedge or use GPS travel course as compass direction. Heading-unavailable devices fall back to location follow. Test outdoors on a compass-equipped iPhone with location services enabled. Simulator location routes can check movement/follow behavior but do not prove physical compass behavior, GPS accuracy, or indoor room positioning.

References: [Apple user location](https://developer.apple.com/documentation/mapkit/mkmapview/showsuserlocation), [heading follow](https://developer.apple.com/documentation/mapkit/mkusertrackingmode/followwithheading), [location permission](https://developer.apple.com/documentation/corelocation/cllocationmanager/requestwheninuseauthorization()).
