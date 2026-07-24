/**
 * LightStream Loans — Google Apps Script
 * ----------------------------------------
 * SETUP INSTRUCTIONS:
 *  1. Go to https://script.google.com  →  New Project
 *  2. Delete any existing code and paste this entire file.
 *  3. At the top, replace SPREADSHEET_ID with your Google Sheet ID.
 *     (Sheet ID is in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
 *  4. Click "Deploy" → "New deployment" → Type: Web app
 *     - Description: LightStream Loan Form v1
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  5. Click Deploy → copy the Web App URL.
 *  6. Paste that URL into app.js where it says:
 *       var GOOGLE_SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
 *
 * That's it! Every form submission will now appear as a new row in your Sheet.
 */

var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // <-- Replace with your Sheet ID
var SHEET_NAME     = 'Loan Applications';          // Sheet tab name (will be created if missing)

/* Column order in the Google Sheet */
var COLUMNS = [
  'Submitted At',
  'Reference No',
  'Loan Purpose',
  'Loan Amount ($)',
  'Loan Term (mo)',
  'Loan Term (yrs)',
  'Fixed APR (%)',
  'Est. Monthly ($)',
  'Total Repayable ($)',
  'First Name',
  'Last Name',
  'Full Name',
  'Email',
  'Phone',
  'Date of Birth',
  'Age',
  'Employment Status',
  'SSN',
  'Bank',
  'Banking Since',
  'Street Address',
  'City',
  'State',
  'ZIP',
  'Full Address'
];

function doPost(e) {
  try {
	var data = JSON.parse(e.postData.contents);
	var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
	var sheet = ss.getSheetByName(SHEET_NAME);

	/* Create sheet + header row if it doesn't exist yet */
	if (!sheet) {
	  sheet = ss.insertSheet(SHEET_NAME);
	  sheet.appendRow(COLUMNS);
	  /* Style header row */
	  var hdr = sheet.getRange(1, 1, 1, COLUMNS.length);
	  hdr.setBackground('#003057').setFontColor('#ffffff').setFontWeight('bold');
	  sheet.setFrozenRows(1);
	}

	/* Build row values in defined column order */
	var row = COLUMNS.map(function(col) {
	  var val = data[col];
	  return (val !== undefined && val !== null) ? val : '';
	});

	sheet.appendRow(row);

	/* Auto-resize columns for readability */
	try { sheet.autoResizeColumns(1, COLUMNS.length); } catch(err) {}

	return ContentService
	  .createTextOutput(JSON.stringify({ status: 'ok' }))
	  .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
	return ContentService
	  .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
	  .setMimeType(ContentService.MimeType.JSON);
  }
}

/* Test function — run from Apps Script editor to verify setup */
function testSetup() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  Logger.log(sheet ? 'Sheet found: ' + SHEET_NAME : 'Sheet will be created on first submission.');
  Logger.log('Setup OK. Deploy as Web App and copy the URL to app.js.');
}
