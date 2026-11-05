# MiniWatt Wrapped

Work in progress. The app connects directly to Garmin's Personal API using a personal key, exchanges it for a temporary token, and imports activities and health data using an app-local adaptation of the web app's Garmin adapter and import coordinator. The copied web metrics, story model and dot renderer produce the recap. The key and imported recap are held in memory during the session.

This is not production ready. Native sharing/export, full privacy controls, accessibility, app lifecycle recovery, release configuration, live Garmin verification and physical-device performance testing remain outstanding. Use only with your own authorized Garmin account. The app has not yet been tested against a real Garmin account or on physical devices.

The source snapshot is from web commit e3102e526e6804ff9546248d86c9f5db8f0f6412; copied files are app-local and hashed in vendor/source-manifest.json.

Run `npm install` then `npx expo start`. Run `node --test tests/*.test.mjs` and `npx tsc --noEmit` for checks. See migration_plan.md for the remaining release gates.
