# Newsletter signup → private Google Sheet

The homepage form (`index.dc.html`) has **no backend of its own** — a static GitHub
Pages site can't write to Google Sheets directly. Instead it POSTs each email to a
**Google Apps Script Web App** that is bound to a private Sheet and appends a row.

- The Sheet stays private to your Google account. Nobody can read the collected
  emails through the endpoint.
- No API keys or credentials live in the public page — only the `/exec` URL, which
  is write-only (a caller can add a row, never list rows).

## One-time setup (~5 minutes)

1. **Create the Sheet.** Go to <https://sheets.google.com>, create a blank
   spreadsheet, and name it e.g. `AWMT Signups`. Leave it private (do **not** share
   it or publish it to the web).

2. **Open the bound script.** In that Sheet: **Extensions → Apps Script**.

3. **Paste the code.** Delete the starter `function myFunction() {}`, then paste the
   entire contents of [`Code.gs`](./Code.gs). Click the 💾 save icon.

4. **Deploy as a Web App.** Click **Deploy → New deployment**:
   - Gear icon → **Web app**.
   - **Description:** `AWMT signup`.
   - **Execute as:** **Me** (your account — this is what lets the script write to
     your private Sheet).
   - **Who has access:** **Anyone** — required so the anonymous public form can
     reach it. This does **not** expose the Sheet; it only lets callers hit the
     `doPost` endpoint, which can only append.
   - Click **Deploy**. Approve the Google permission prompt (it's your own script;
     "Advanced → Go to … (unsafe)" is expected for a personal script).

5. **Copy the Web app URL** — it ends in `/exec`, e.g.
   `https://script.google.com/macros/s/AKfy…/exec`.

6. **Wire it into the site.** Open `index.dc.html`, find:
   ```js
   var SIGNUP_ENDPOINT = '';
   ```
   and paste your URL between the quotes. Commit and deploy.

7. **Test.** Load the homepage, submit a real address, and confirm a new row
   appears in the `Signups` tab. Visiting the `/exec` URL directly should return
   `{"ok":true,"service":"awmt-signup"}`.

## Redeploying after code changes

Editing `Code.gs` does **not** update the live endpoint by itself. Either:
- **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (keeps
  the same `/exec` URL — no site change needed), or
- create a new deployment (gives a new URL — you'd have to update
  `SIGNUP_ENDPOINT` again). Prefer editing the existing deployment.

## Optional hardening

- **Shared token.** Set `SHARED_TOKEN` in `Code.gs` to a random string, and add a
  matching `token` field to the form's POST body in `index.dc.html`. This blocks
  drive-by bots hitting the raw `/exec` URL. It's obfuscation, not a true secret
  (the token ships in the public page), but it filters noise. The form already
  includes a hidden honeypot field and client + server email validation.
- **Email alerts.** Add a `MailApp.sendEmail(...)` call inside `doPost` to get
  notified on each new signup.
