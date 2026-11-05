# Native privacy disclosure inventory

Prepared from the implementation on 5 November 2026. Store-console answers and a publicly hosted mobile policy are not yet submitted. The owner must complete them against the actual signed build and current store definitions.

| Data | Where it goes | Retention / controls |
| --- | --- | --- |
| Personal API key | Native UI -> Garmin HTTPS key exchange; optionally platform SecureStore | Input clears when import begins. Opt-in only; saved after Garmin accepts it. Forget, untick or Clear data removes the saved key. iOS Keychain may survive reinstall; revoke on Garmin to revoke upstream access. |
| Bearer token | Garmin -> native import only -> Garmin requests | Separate in-memory token per import, 20-minute local cap; discarded after completion/error/cancel. It is never sent to the DOM viewer, files or app servers. Local deletion is not remote revocation. |
| Activity/daily/sleep/HRV records | Garmin -> native memory for the requested recap | No durable recap archive, analytics, tracking or recurring sync. Optional daily/health fetch switches and explicit access consent. An import is cancelled when interrupted. No recovery after process termination. |
| Recap display fields | Native memory -> bundled viewer | Allowlisted text/values/charts only, no raw records, IDs, source evidence, keys, tokens or location fields. WebView browsing data is ephemeral; external navigation is rejected. Native Read card supports accessible text. |
| PNG export | Bundled renderer -> bounded native transfer -> app cache -> chosen receiving app | Health cards need consent for each share interaction before preview/export. Sanitized 1080 × 1920 Canvas PNG with no private metadata chunks. Unshared previews deleted on close; handed-off files kept for receiver compatibility and swept after 24 hours on next app launch/resume. Clear data deletes owned exports immediately. External copies are outside this app's control. |
| Network connection metadata | Device/network providers and Garmin | Direct native TLS using OS trust. No mobile backend, telemetry, app analytics or ad SDK. External MINI WATT/Garmin links open in the system browser under those services' policies. |

The app requests Internet access. It does not request Apple Health, Health Connect, location, microphone, media-library read access or a photo library permission. Saving is offered through the native share sheet; available destinations vary by device. Android backups are disabled and secure storage is configured for backup exclusion. iOS data is not placed in Documents for backup; temporary exports use cache, and keys use device-only Keychain accessibility.

Apple's and Google's “collected,” “shared,” user-initiated transfer and ephemeral-processing definitions must be applied by the publisher to Garmin and receiving-app traffic as well as any later added SDKs. The implementation contains no developer-operated data-collection endpoint; do not add analytics/crash payload collection without revisiting consent and these disclosures. Native config's tracking/collection manifests do not substitute for store answers or OS/device checks.

Controller/support: Nick Smet, Kalmthout, Belgium; info@miniwatt.app. Preserve the independent Garmin/non-endorsement notice. Explain access/deletion/consent withdrawal and complaint rights in the published mobile policy, using the existing product identity. The frozen website's privacy page describes browser storage/server cookies and must not be represented as the complete native policy.
