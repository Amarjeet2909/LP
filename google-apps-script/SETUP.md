# Google Sheets Integration — Setup Guide

This folder contains the Google Apps Script that receives loan application
data from the website and writes it to a Google Sheet.

---

## Step-by-Step Setup

### 1. Create a Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com) → create a new blank sheet.
2. Name it anything (e.g. **"LightStream Applications"**).
3. Copy the **Spreadsheet ID** from the URL bar:
   ```
   https://docs.google.com/spreadsheets/d/  THIS_PART_IS_THE_ID  /edit
   ```

---

### 2. Deploy the Apps Script
1. Go to [script.google.com](https://script.google.com) → **New Project**.
2. Delete all existing code in the editor.
3. Open `Code.gs` from this folder and paste its entire contents.
4. At the top of the pasted code, replace:
   ```js
   var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
   with your actual Sheet ID.
5. Click **Deploy** → **New deployment**.
   - **Type:** Web app  
   - **Execute as:** Me  
   - **Who has access:** Anyone  
6. Click **Deploy** → authorize when prompted → **copy the Web App URL**.

---

### 3. Connect to the Website
Open `app.js` and find this line near the top of the submit section:
```js
var GOOGLE_SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
```
Replace the placeholder with the URL you copied in step 6.

**Save** the file — that's it! Test by submitting the form.

---

## What Gets Captured in the Sheet

| Column | Description |
|---|---|
| Submitted At | Date & time of submission |
| Reference No | Unique application ID (e.g. LS-A1B2C3D4) |
| Loan Purpose | Home improvement, Auto, etc. |
| Loan Amount ($) | Amount requested |
| Loan Term (mo) | 24 / 36 / 48 / 60 / 72 / 84 months |
| Fixed APR (%) | Always 9.99 |
| Est. Monthly ($) | Calculated monthly payment |
| Total Repayable ($) | Total cost of loan |
| First / Last Name | Applicant name |
| Email | Applicant email |
| Phone | Formatted phone number |
| Date of Birth | DOB entered |
| Age | Age at time of application |
| Employment Status | e.g. Full-time, Self-employed |
| SSN | Full SSN (digits only, stored securely in your private Sheet) |
| Bank | Bank name entered |
| Banking Since | Duration with current bank |
| Full Address | Street, City, State, ZIP |

---

## Notes
- The script creates the **"Loan Applications"** tab automatically on first submission (with styled headers).
- If a network error occurs, the user still sees the thank-you screen — no data is lost since a copy is also kept in `sessionStorage`.
- All SSN data is masked before sending (only last 4 digits transmitted).
