# Legacy iOS Tree

`apps/ios/SmartBLE/` is a legacy snapshot kept only for reference.

Current development, verification, and `Package.swift` builds use `apps/ios/Sources/`.

Rules:

- Do not add new features here.
- Do not fix bugs here unless the same change is also required in `apps/ios/Sources/`.
- Prefer deleting this tree in a later cleanup pass once all useful history has been migrated.
