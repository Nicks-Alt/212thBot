const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to check if a user is registered
async function isUserRegistered(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A2:C1000`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    const nonEmptyRows = rows.filter(row => row && row.length > 0 && row[0]);
    const existingEntry = nonEmptyRows.find(row => row[0] === discordId);
    
    return !!existingEntry; // Convert to boolean
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false; // Default to not registered on error
  }
}

module.exports = {isUserRegistered}