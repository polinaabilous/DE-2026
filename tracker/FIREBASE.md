# Firebase tracker

Live app: https://ae-roadmap-dc348858.web.app

Use the same Google account on your phone and computer. The data button shows **Cloud saved**, **Saving…**, or **Offline · saved here**. Open it for JSON backups, Markdown exports, importing a backup, and signing out. On a phone, you can add the website to your home screen through the browser's share/menu controls.

The project uses Firebase Hosting, Google Authentication, and a standard Firestore database in `us-west1`. Billing is disabled. It needs no Cloud Functions, paid file-storage bucket, or running laptop.

## Data

The saved folder was copied to `backups-private/before-cloud-migration.json` and migrated to the verified Google identity. `backups-private/migration-receipt.json` records the account UID and record count. Neither file is inside the Hosting directory or tracked by Git. The original folder is retained.

Cloud records live at `users/{uid}/records/{sha256-key}`. Each note, log entry, to do, checklist cell and practice status / notes field (historical attempt records are retained) has its own record. Writes update only changed records; deletions retain a tombstone so stale devices do not resurrect deleted entries. Pending changes survive reload in an account-specific local outbox and are sent after reconnecting. Server acknowledgement is required before displaying **Cloud saved**. Concurrent edits to the same individual record use the last accepted write; different entries/checklist cells are independent.

Only the matching authenticated UID with the owner's verified email can access records. All other database paths are denied. Record payloads have size and field validation. Indexing is disabled for record contents because the app reads its user's collection and filters locally.

Cloud mode and folder mode are separate. While signed in, saved changes go to the cloud; folder reloads cannot replace cloud data. JSON and Markdown exports remain available. Importing JSON deliberately replaces account data across devices and asks for confirmation. A first sign-in only migrates local progress automatically when the cloud collection is empty; an existing cloud account takes precedence. The earlier local copy is retained separately.

## Development and deployment

From this directory:

```sh
npm ci
npm test
npm run test:rules
npm run deploy
```

The rule tests use a `demo-` project and require Java 21. They never access production data. Google CLI credentials are stored in the standard local Firebase CLI configuration, outside this synced project. Generated logs and Hosting caches are ignored by Git.

`firebase.json` publishes only `ae-tracker/`; the notes folder, private backups, CLI credentials, maintenance scripts, and tests remain outside the published directory. Firebase's web configuration is intentionally public. Access control comes from `firestore.rules`, not from hiding the API key. The SDK is pinned to version 12.19.0 and loaded from Google's CDN only when cloud configuration exists.

`npm run backup` exports the saved folder to a new timestamped private file. It does not fetch current cloud records; use the app’s Export JSON for that. The completed one-time setup and migration scripts have been removed. See [development.md](docs/development.md) for the code structure and repeatable browser/sync checks.

For local work without Firebase, set `window.AE_FIREBASE = null` in `ae-tracker/firebase-config.js`. To test the real cloud adapter locally, use a separate fixture with a `demo-` project and `emulators: { auth: 9099, firestore: 8080 }` in its configuration. Emulator endpoints are accepted only on localhost.

Validation performed: editing/storage/all-view browser suite (82 checks), cloud serialization/offline merge tests, emulator rule tests, and two isolated browser profiles covering migration, cross-device edits, offline reconnection, deletion, to do completion, daily logs, and reloads.
