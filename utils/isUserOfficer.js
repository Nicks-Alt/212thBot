const { google } = require('googleapis');

async function isUserOfficer(discordId) {
  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: './service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }

    // Get the officer data directly from the spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Users'!A2:C`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('No officer data found in spreadsheet');
      return false;
    }

    const userRow = rows.find(row => row[0] === discordId);
    
    // If user found and officer status is true (column C, index 2)
    console.log(`Officer check for ${discordId}: ${userRow && userRow.length > 2 && (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true")}`);
    return userRow && userRow.length > 2 && 
           (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

module.exports = {isUserOfficer}