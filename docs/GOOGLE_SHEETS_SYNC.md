# 🌐 Automatic Google Sheets Synchronization Guide

This guide enables `npm run update-tests` to **directly update** your live Google Sheet:
👉 [https://docs.google.com/spreadsheets/d/1Oegv60f02ZKVArQYtig9M6IUijYsCywT0UcnUvBsbvI/edit?gid=570024134#gid=570024134](https://docs.google.com/spreadsheets/d/1Oegv60f02ZKVArQYtig9M6IUijYsCywT0UcnUvBsbvI/edit?gid=570024134#gid=570024134)

---

## ⚡ 1-Minute Setup Instructions

### Step 1: Open Apps Script in Google Sheets
1. Open your Google Sheet: [Open Sheet](https://docs.google.com/spreadsheets/d/1Oegv60f02ZKVArQYtig9M6IUijYsCywT0UcnUvBsbvI/edit?gid=570024134#gid=570024134)
2. In the top menu, click **Extensions** ➔ **Apps Script**.

---

### Step 2: Paste the Sync Webhook Code
In the Apps Script editor, delete any existing code in `Code.gs` and paste the following:

```javascript
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Find the sheet by GID (570024134) or use the active sheet
    var targetSheet = null;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId().toString() === (payload.sheetGid || "570024134")) {
        targetSheet = sheets[i];
        break;
      }
    }
    if (!targetSheet) {
      targetSheet = ss.getActiveSheet();
    }
    
    if (payload.rows && payload.rows.length > 0) {
      // Clear old rows starting from row 1
      targetSheet.getRange(1, 1, Math.max(targetSheet.getLastRow(), 1), targetSheet.getLastColumn() || 9).clearContent();
      
      // Write updated rows
      targetSheet.getRange(1, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
      
      // Format header row (Row 1)
      var headerRange = targetSheet.getRange(1, 1, 1, payload.rows[0].length);
      headerRange.setBackground("#1E293B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      updated_rows: payload.rows.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

### Step 3: Deploy as a Web App
1. At the top right of the Apps Script editor, click the blue **Deploy** button ➔ **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in:
   * **Description:** `Harness Tracker Auto Sync`
   * **Execute as:** `Me (your email)`
   * **Who has access:** `Anyone` (Important: allows the command to post updates without OAuth complexity)
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Add URL to your `.env.local`
In your project folder (`d:\HARNESS-TRACKER\`), create or edit `.env.local` and add:

```env
GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_DEPLOYED_ID_HERE/exec"
```

---

## 🎯 Verification
Now, whenever you run:
```bash
npm run update-tests
```
It will:
1. Re-scan your automated tests in `scripts/test_poka_yoke.mjs`.
2. Re-generate local `.xlsx`, `.xls`, and `TEST_SCENARIOS_REFERENCE.md`.
3. **Automatically update your live Google Sheet directly over the cloud!** 🚀
