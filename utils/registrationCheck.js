const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Checks if a user is registered in the system
 * @param {string} discordId - The Discord ID of the user
 * @returns {Promise<boolean>} - Whether the user is registered
 */
async function isUserRegistered(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A2:B1000`, // Adjust range as needed
    });

    const rows = response.data.values || [];
    const existingEntry = rows.find(row => row[0] === discordId);
    
    return !!existingEntry; // Convert to boolean
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false; // Default to not registered on error
  }
}

/**
 * Gets a user's SteamID from the registration system
 * @param {string} discordId - The Discord ID of the user
 * @returns {Promise<string|null>} - The user's SteamID or null if not found
 */
async function getUserSteamID(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Users'!A2:B1000`, // Adjust range as needed
    });

    const rows = response.data.values || [];
    const userEntry = rows.find(row => row[0] === discordId);
    
    if (userEntry && userEntry[1]) {
      return userEntry[1]; // SteamID is in column B (index 1)
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user SteamID:', error);
    return null;
  }
}

module.exports = { isUserRegistered, getUserSteamID };