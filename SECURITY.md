# Security Checklist

## Release Checklist

- Keep the API base URL on HTTPS only for release builds.
- Build and test release artifacts after auth-storage changes:
  - Android: `./gradlew app:assembleRelease`
  - iOS: `xcodebuild -workspace BudgetApp.xcworkspace -scheme BudgetApp -configuration Release -sdk iphonesimulator`
- Treat a reinstall as a new secure-storage context because the MMKV encryption key is now generated per install and stored in the OS keystore/keychain.

## Account Safety

- Offline registration no longer stores passwords locally. If a future offline flow is added again, do not persist credentials or refresh tokens outside OS-backed secure storage.
- If device compromise is suspected, revoke backend sessions and rotate backend JWT secrets rather than trusting local logout alone.
- Keep Google/Firebase configuration and signing credentials out of the repo and out of debug logs.

## Dependency Status

- `npm audit --omit=dev` is clean after the React Native CLI patch upgrades and transitive overrides in this repo.
- The remaining security-sensitive storage changes still need full iOS build verification on a machine with a working Xcode installation.
