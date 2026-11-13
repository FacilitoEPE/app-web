# Provider certificate S3 integration

> Registro histórico. Consulta el [flujo de certificados en S3](../../../epe-backend/docs/backend-flow.md#42-flujo-s3-con-url-prefirmada-certificados-de-proveedor) para la implementación actual. Revisar este registro el 10/02/2027.

## Objective
Integrate direct-to-S3 document upload and ephemeral download for `certificado_proveedor`, matching `test_documento.txt` without changing other document-bearing resources.

## Problem and rationale
Provider certificates currently accept a permanent `documentoUrl`, but the AWS test contract requires the backend to issue a short-lived upload URL, confirm the S3 object, and persist an `documentoArchivoId` reference.

## Scope and constraints
- Only provider certificates (`certificado_proveedor`). Do not change campaign certificates, exams, or unrelated resources.
- Validate PDF/JPEG/PNG/WebP and a 10 MiB maximum before requesting upload.
- Upload raw file to S3 using only the backend-provided method and headers; never send API Authorization to S3.
- Confirm `DISPONIBLE` before creating the certificate; use `documentoArchivoId` in JSON.
- Downloads request a fresh URL and do not persist it.
- Preserve existing form, CRUD, and error-state conventions. Do not alter user-owned `.env`, `test_documento.txt`, or pre-existing `.atl` changes.

## TDD and delivery
- TDD: enabled by session configuration; source: `C:\Users\luis-keny\.codex\config.toml`; runner: `pnpm test` (Vitest), following the repository's pnpm-only package-manager convention.
- Route: delegated direct; mapping trigger fired (4+ relevant files), writer trigger fired (multiple non-trivial files).
- Estimated changed lines: ~300; delivery strategy: ask-on-risk.

## Tasks
- [x] T1 — Add and test typed S3 upload/confirmation/download API flow and certificate DTO/validation changes. Evidence: focused Vitest tests passed.
- [x] T2 — Wire provider certificate form/list UI to upload, progress/error states, and ephemeral download; update backend/API integration matrix. Evidence: full Vitest suite and production build passed.
- [x] T3 — Require a replacement file when editing a provider certificate; upload and confirm it through S3, then PATCH using the new `documentoArchivoId`. Update tests and the integration matrix. Evidence: focused replacement-flow test, full suite and build passed.
- [x] T4 — Reconcile the provider subresources merge conflict by preserving the redesigned UI and certificate S3 flow together. Restore certificate edit-state initialization and retain the required replacement-file behavior. Evidence: conflict markers removed and resolution staged; focused API tests passed (9 tests), full suite passed (31 files / 115 tests); production build is blocked by TypeScript errors in unrelated campaign modal files.

## Acceptance criteria
- Unsupported/oversize files fail before any upload-request API call.
- Correct signed URL sequence, exact S3 method/headers, no Authorization, and no next step after failures.
- Certificate create sends `documentoArchivoId` only after confirmation state is `DISPONIBLE`.
- Certificate edit requires a new valid file and sends its `documentoArchivoId` only after S3 confirmation returns `DISPONIBLE`.
- Download opens a newly requested `downloadUrl` safely.
- No S3 flow is applied to other resources.
- Documentation has current date, status, exact routes, and remaining caveats.

## Checks
- RED: focused Vitest tests covering validation, sequence, headers, confirmation gating, create DTO, and download.
- GREEN/REFACTOR: `pnpm test` and `pnpm build`.

## Progress
T1–T4 are complete. Backend contract verified: PATCH accepts optional positive documentoArchivoId and checks availability within the proveedor-specific S3 prefix. Both create and edit validate file type/size, obtain a presigned upload URL, send the raw file with only returned method/headers, require confirmation state `DISPONIBLE`, then POST/PATCH with the uploaded `documentoArchivoId`. Download obtains a fresh signed URL. The merge resolution combines the redesigned provider UI with this certificate-only upload flow. Coordinated S3 deletion remains out of scope.

Verification:
- RED observed for T3: the focused replacement test failed because `updateCertificadoProveedorWithFile` did not yet exist.
- Focused Vitest: provider subresource API tests passed (9 tests).
- `npm test`: 23 test files passed; 82 tests passed.
- `npm run build`: passed (`tsc -b` and Vite production build); Vite emitted its existing large-chunk advisory.
- Merge reconciliation: `pnpm test -- src/modules/providers/api/provider-subresources.api.test.ts` passed (9 tests); `git diff --check` passed. `pnpm build` failed with TypeScript errors in `CampaignFormModal.tsx`, `CampaignLinkClientModal.tsx`, and `CampaignLinkProviderModal.tsx`; none named `ProviderSubresources.tsx`.
- Parent spot-check: `pnpm test` passed (31 test files, 115 tests).
- No live AWS/API verification was performed; user testing remains.

Current branch: `master` (merge in progress; resolution has not been committed).

## Next step
Complete the in-progress merge with a merge commit according to repository policy; then user exercises create/edit/download against the configured AWS-backed API. Resolve unrelated campaign modal TypeScript errors before claiming a clean production build.

## Persistence status
- Engram recovery mirror: saved via CLI under the project memory.
