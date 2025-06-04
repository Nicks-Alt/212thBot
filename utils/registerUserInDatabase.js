const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to register user in the database
async function registerUserInDatabase(discordId, steamId, isOfficer) {
  try {
    // Get the data to find the first empty row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A2:C1000`,
    });
    
    const rows = response.data.values || [];
    
    // Find the first empty row
    let emptyRowIndex = 2; // Start from row 2 (after headers)
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i][0]) {
        emptyRowIndex = i + 2; // +2 because we start from row 2 and array is 0-indexed
        break;
      }
      emptyRowIndex = i + 3; // Next row after the last filled one
    }

    // Store officer status as a string "TRUE" or "FALSE" for consistency
    const officerValue = isOfficer ? "TRUE" : "FALSE";
    console.log(`Registering user ${discordId} with officer status: ${officerValue} at row ${emptyRowIndex}`);

    // Insert the new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A${emptyRowIndex}:C${emptyRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[discordId, steamId, officerValue]]
      }
    });

    console.log(`Successfully registered user ${discordId} in database`);

    return { success: true };
  } catch (error) {
    console.error('Error registering user in database:', error);
    return { success: false, message: 'An error occurred while registering in the database. Please contact an administrator.' };
  }
}

module.exports = { registerUserInDatabase };