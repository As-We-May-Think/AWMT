/**
 * As We May Think — newsletter signup endpoint.
 *
 * A Google Apps Script Web App, bound to a private Google Sheet, that appends one
 * row per email signup. The public homepage form (index.dc.html) POSTs a
 * form-encoded body to this script's "/exec" URL; nothing here is exposed to the
 * page except that URL, and the Sheet itself stays private to your Google account.
 *
 * Setup lives in README.md next to this file.
 */

// ── Config ───────────────────────────────────────────────────────────────────
// Tab (sheet) the rows are written to. Created automatically if missing.
var SHEET_NAME = 'Signups';

// Optional shared secret. Leave '' to accept any POST (the form still has a
// honeypot + email validation). If you set it, also set the same value as
// SIGNUP_TOKEN in index.dc.html so the form sends it.
var SHARED_TOKEN = '';

// Skip a signup if the email is already in the sheet (case-insensitive).
var DEDUPE = true;

// ── Handlers ─────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var params = (e && e.parameter) || {};

    if (SHARED_TOKEN && params.token !== SHARED_TOKEN) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var email = String(params.email || '').trim();
    if (!isValidEmail_(email)) {
      return json_({ ok: false, error: 'invalid_email' });
    }

    var source = String(params.source || '').trim().slice(0, 60);
    var clientTs = String(params.ts || '').trim().slice(0, 40);

    // LockService serialises appends so two simultaneous signups can't collide.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet_();
      if (DEDUPE && emailExists_(sheet, email)) {
        return json_({ ok: true, duplicate: true });
      }
      sheet.appendRow([new Date(), email, source, clientTs]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Visiting the /exec URL in a browser confirms the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'awmt-signup' });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Received (server)', 'Email', 'Source', 'Client timestamp']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function emailExists_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return false; // only the header
  var values = sheet.getRange(2, 2, last - 1, 1).getValues(); // column B = Email
  var needle = email.toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === needle) return true;
  }
  return false;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
