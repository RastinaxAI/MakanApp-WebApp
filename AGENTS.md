# Active Makan client

- The only active application is `web/`: Next.js/React, personal user, Student, Teacher, Parent and school Manager.
- Read `web/AGENTS.md` and the installed Next.js guides before editing that app.
- The platform-owner application is the separate sibling `MakanManagement`. Do not overwrite it or restore owner endpoints into this client.
- The user explicitly retired the legacy root Vite application. Its source was verified and archived outside this workspace on 2026-10-30. Do not restore the old root source, build output, dependencies or Docker service.
- Root Compose includes `web/compose.yaml`; the canonical application build and lockfile are in `web/`. Keep the root launcher thin.
- Preserve Docker session volumes and local secret files. Never print or commit secrets.
- Record current changes, evidence and limitations in `web/docs/PROGRESS.md`.
- Unclassified root files/folders are not automatically removable; inspect their purpose first.
