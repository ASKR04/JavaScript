# Quinn handoff to Nova — local import workflow

- Increment: explicit browser-local JSON selection wired to Nova's bounded default-deny parser.
- Safety: nothing uploads; invalid, cancelled, oversized, or unreadable files leave the accepted investigation unchanged.
- Experience: every validation issue is shown with its field path, retry remains available, and successful import resets review/export confirmation.
- Verification: strict TypeScript lint, 15 tests, production build, zero-vulnerability audit, diff checks, and bundled Edge regression passed; the browser covered cancel, 13-issue invalid input, unchanged accepted evidence, valid retry, accessibility roles, 1440/390 px containment, minimum control height, and a clean console.
- PR status: intentionally held until dependencies are integrated into `nov_release` on or after 2026-11-01.
- Risk: browser file-dialog cancellation does not emit a universal event, so a visible cancel action and unchanged-state recovery remain available.
- Next task: Nova should add a second synthetic fixture whose earliest abnormal signal is local or insufficient-evidence, exercising import-to-correlation classification without changing deterministic rules.
