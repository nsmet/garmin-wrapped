# MiniWatt Wrapped — mobile privacy policy

Prepared 5 November 2026 for the iOS implementation. This text is ready for owner review and independent hosting before App Store submission. It describes the current app; it is not the frozen website's browser/cookie policy.

MiniWatt Wrapped is an independent MINI WATT project by Nick Smet in Kalmthout, Belgium. Privacy and support contact: info@miniwatt.app. It is not affiliated with or endorsed by Garmin.

## Your Garmin connection

You choose to connect your own authorized Garmin account with a Garmin Personal API key. The app sends that key directly to Garmin over HTTPS to obtain a temporary access token. Your Garmin password is not requested. We do not operate a mobile server receiving your key or records.

The key is cleared from the entry field when import begins. By default it remains only in memory during the exchange. If you explicitly choose Remember my key, it is saved after Garmin accepts it in the device's secure storage. You can untick that choice, use Forget saved key, or use Clear data to remove it. iOS Keychain may survive an app reinstall; revoke the key through Garmin to revoke access at its source.

The bearer token is kept separately for each import, used only for Garmin requests, and discarded after completion, failure or cancellation. Local cleanup does not revoke your Garmin key or guarantee immediate invalidation of an upstream token.

## Records and your recap

With your permission, the app imports activity records for your requested current-year recap. You can choose daily movement and health stories. Optional daily/sleep/HRV requests follow those choices. Activity API responses can themselves contain recorded activity heart-rate fields; health stories are admitted only when you allow them. Missing records or measurements are not invented, and unavailable sources are explained through coverage warnings.

Records and the calculated recap stay in memory while the app process runs. They are not saved as a recap archive, uploaded to an app service, or used for recurring/background syncing. Leaving the app during import cancels that import. A completed recap can remain available in memory when you return; after process termination or a cold launch you must reconnect. Saving a key is separate from saving a recap.

The graphics viewer receives only the displayed words, values and chart aggregates it needs. Keys, tokens, raw records, Garmin activity identifiers, source evidence identifiers and location fields are not sent to it or included in the export schema. Native network response caching is disabled in the app's own binaries. The app does not use analytics, advertising SDKs or tracking cookies.

## Sharing and temporary images

You choose whether and where to share a card. A real health card requires a separate, explicit decision for that share interaction before its share preview or image is generated. Closing the share screen, clearing data or leaving the app ends that permission; handing an already authorized image to the system share sheet is the requested transfer.

Exports are 1080 × 1920 PNG images of the selected card's displayed metric/caption and chart. They exclude personal identifiers, source records and private metadata fields. Promotional cards cannot be exported. The image is written to the app's cache so the native share sheet can pass it to your chosen destination.

Unshared previews are removed when you close the share screen. Files handed to another app are retained for receiving-app compatibility, then removed on the first app launch or resume after 24 hours. The operating system may also clear cache files. Clear data removes the app's owned export files immediately. Images saved or shared outside this app cannot be recalled by the app; the destination's own policies and controls apply.

The app does not request access to your photo library. Save destinations are provided by the system share sheet and installed receiving apps, and vary by device.

## Other services and device access

Garmin processes requests and connection metadata under its own privacy policy and account settings. Your network provider also processes network traffic. Links to Garmin or MINI WATT open in the system browser and are subject to those services' policies. The app has no Apple Health or Health Connect integration and does not request location, microphone or media-library read access.

Our source and test fixtures do not contain real Garmin keys, tokens or personal health records. Support does not need those records: provide the app version, device/OS and a redacted error description. Never send your API key, token or private recap screenshot in a support report.

## Your choices and contact

You can decline optional stories, cancel an import, decline health sharing, forget a saved key, or clear all app data from Privacy & coverage. Clear data cancels requests and removes this app's in-memory recap, saved key and temporary exports. It does not delete your Garmin account/history, revoke a Garmin key, or remove externally shared copies. Manage or revoke Garmin access on Garmin's official Personal API settings page.

Contact info@miniwatt.app with privacy questions, access/deletion requests or a complaint. Because we do not receive or retain a cloud copy of your recap, the device controls above are the direct way to remove the app's local material. You may also contact your applicable data-protection authority; the existing product's controller is in Belgium, where the authority is the Belgian Data Protection Authority (dataprotectionauthority.be).

If future versions add a backend, analytics, archives or other data flows, this policy and the app's consent/store disclosures must be reviewed before those features ship.
