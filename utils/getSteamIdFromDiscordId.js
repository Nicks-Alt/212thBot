// Function to get SteamID from Discord ID using direct API call

const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function getSteamIdFromDiscordId(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A2:C1000`,
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === discordId);
    
    return userRow ? userRow[1] : null;
  } catch (error) {
    console.error('Error getting SteamID from Discord ID:', error);
    return null;
  }
}

module.exports = {getSteamIdFromDiscordId}