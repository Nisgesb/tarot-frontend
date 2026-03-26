# Phase 2 Roadmap: Expo / Native Rebuild

This Capacitor pass keeps the current React + Vite web runtime intact for speed and parity.  
A future Expo/native rebuild should focus on extraction-first, then selective rewrites.

## Suggested sequence

1. **Extract pure domain modules first**
   - Keep `dreamGenerationService`, scene-state logic, and data models framework-agnostic.
   - Move non-UI logic into `/src/domain` so it can be shared by web and Expo.

2. **Define a stable platform boundary**
   - Keep one adapter contract for storage, share/export, motion input, haptics, and audio session.
   - Implement adapters for both web (current) and Expo (future) behind identical TypeScript interfaces.

3. **Rebuild rendering surfaces natively**
   - Replace heavy DOM/canvas scenes with React Native + Skia/GL equivalents where performance matters.
   - Keep visual language, transitions, and scene ordering from v1 as acceptance criteria.

4. **Migrate navigation only after scene parity**
   - Introduce Expo Router/React Navigation when each scene is functionally matched.
   - Keep current scene machine semantics as a compatibility layer during migration.

5. **Add native-only capabilities after parity**
   - Background audio policies, richer share sheets, haptics, sensor fusion, and offline asset packaging.
   - Delay analytics/push/account/cloud features until core UX is stable in native.

## Exit criteria for Phase 2

- Scene-by-scene behavior parity with current web flow.
- Equal or better startup and interaction smoothness on mid-tier iOS/Android devices.
- Shared business logic package used by both web and Expo apps.
