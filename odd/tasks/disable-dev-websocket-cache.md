# Disable Development WebSocket and Cache Features

> Registro histórico. La [guía de desarrollo](../../docs/development.md) define la configuración actual de HMR. La decisión de conservar `public/sw.js` sigue vigente. Revisar este registro el 10/02/2027.

## Objective
Temporarily stop Vite's development HMR websocket and stop the application service worker from registering or serving cached content, while preserving its source for later reactivation.

## Problem and Why
The user asked to disable WebSockets and cache storage for now, with feature decisions deferred. Existing service-worker registrations may continue controlling the development page and its `epe-shell-v1` cache.

## Scope and Constraints
- Authorized scope: Vite HMR configuration and application service-worker startup/cleanup behavior, plus focused tests.
- Preserve `public/sw.js` as source for later; do not remove or rewrite its feature logic.
- Unregister only this app's `/sw.js` service worker and delete only its `epe-shell-v1` cache; leave unrelated registrations and caches untouched.
- Do not touch the separate React hook issue.
- Forecast: under 400 authored changed lines.
- Delivery strategy: `ask-on-risk`.

## Resolved TDD and Route
- Strict TDD: enabled by user instructions; runner is `npm.cmd test` (`vitest run`).
- Route: delegated direct (this bounded worker owns exploration, preparation, implementation, and verification); preparation plus a multi-file change trigger this route.

## Checklist
- [x] T1: Disable Vite HMR websocket; prevent service-worker registration, clean up only this application's existing worker/cache, and add focused tests.
  - Acceptance: Vite HMR websocket is disabled; app code does not register the worker; cleanup targets only `/sw.js` and `epe-shell-v1`; service-worker source remains intact.
  - Checks: RED observed (missing cleanup module); GREEN observed (2 focused tests passed); `npm.cmd test` passed (7 files, 23 tests); `npm.cmd run build` passed after an initial run encountered a transient shared-worktree missing-component state; final build completed with only the existing large-chunk warning.
  - Rollback boundary: revert Vite HMR configuration and startup cleanup/test changes, leaving `public/sw.js` unchanged.
  - Runtime harness: N/A — no live browser harness is configured for this focused development-server behavior.
  - Commit evidence: `99f3db1` (`chore(dev): disable websocket and service worker cache`).
  - Review assessment: RDD status reports off (clone-local unset); native command then refused because repository `.git` ownership is not trusted, so assessment unavailable.

## Progress and Next Step
- T1 implementation and functional tests are complete. `public/sw.js` remains unchanged; only the `/sw.js` root registration and `epe-shell-v1` cache are targeted for cleanup.
- T1 is complete and committed. The unrelated campaign-provider changes present in the shared worktree were not staged or included.
