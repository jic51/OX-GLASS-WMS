# Finding: `drive.file` is blocked by Apps Script's DriveApp service

**Status:** attempted, reverted. Reopening this needs a rewrite, not a retry.
**Tested:** v8.22 on a scratch copy, Aug 2026.

## Why we wanted it

`https://www.googleapis.com/auth/drive` (full Drive) is a **restricted** scope.
Two consequences:

1. The consent screen a customer sees says *"see, edit, create and delete **all**
   your Google Drive files"* — which is alarming, and false in spirit: the app
   only ever touches files it created itself.
2. Distributing through the Google Workspace Marketplace with a restricted scope
   requires an annual third-party CASA security audit (~$500–$4,500/yr).

`drive.file` — *"per-file access to files created or opened by the app"* — is
non-restricted and describes what this app actually does. Removing
`mail.google.com` in v8.20 already got us to one restricted scope; this was
meant to get us to zero.

## What actually happened

The app loads and saves movements fine under `drive.file`. Every Drive **write**
fails:

```
Los permisos especificados no son suficientes para llamar a DriveApp.getRootFolder.
Permisos necesarios: (drive.readonly || drive)

Los permisos especificados no son suficientes para llamar a DriveApp.createFolder.
Permisos necesarios: https://www.googleapis.com/auth/drive
```

The first one was ours to fix and we fixed it — `getOrCreateFolder_()` only
cached the leaf of a path, so a cold cache fell through to a walk from
`DriveApp.getRootFolder()`. It now caches every level and never touches the root.

The second one is the wall. **`DriveApp.createFolder()` demands full `drive`,
even though the folder it creates would belong to the app.** This is not about
what the operation touches; DriveApp declares scope requirements per method,
coarsely, and `drive.file` is not among the ones it accepts. No amount of
restructuring our code gets around it, because the requirement is attached to
the DriveApp method itself.

Everything downstream fails for the same reason: uploading a rack photo, a
document, an incoming-delivery attachment, assembling the multi-photo PDF, and
the daily backup all create a folder or a file through DriveApp.

## What it would take

Stop using DriveApp for writes and call the Drive REST API directly with
`UrlFetchApp` + `ScriptApp.getOAuthToken()`. The REST API honours `drive.file`
properly — the restriction is DriveApp's, not Drive's.

Roughly: folder create/list, file create (multipart upload), file read (get +
media download), `parents` traversal, copy, and move. Call sites:
`getOrCreateFolder_`, `uploadFiles_`, `uploadRackPhoto`, `uploadIncomingDoc_`,
`photosToDocPdf_`, `getPrivateFileData`, `isFileWithinAppFolder_`,
`runBackupNow_`. Every one needs live testing, since scope behaviour here is
only discoverable by running it.

Unresolved risk: `photosToDocPdf_` also uses `DocumentApp`, which may carry the
same coarse-scope problem. Check that before committing to the work.

## Recommendation

Not now. It buys nothing for the copy-per-customer model we actually ship —
each customer authorizes their own copy of the script, so there is no OAuth
verification and no CASA either way. It only pays off if we publish to the
Marketplace, and it makes the consent screen friendlier.

Revisit when Marketplace distribution becomes a real plan. Until then the base
manifest keeps full `drive` and stays free of restricted **Gmail** scope, which
was the larger of the two wins.
