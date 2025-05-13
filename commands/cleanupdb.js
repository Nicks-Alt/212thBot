const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cleanupdb')
    .setDescription('Clean up the Bot database by removing entries for users no longer in the 212th'),

  async execute(interaction) {
    console.log(`Cleanupdb command started by ${interaction.user.tag} (${interaction.user.id})`);
    
    try {
      // NOTE: We don't need to reply or defer here since index.js already does that
      // Just use editReply throughout this command
      
      console.log("Checking user permissions");
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      console.log(`User is officer: ${isOfficer}`);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'This command is only available to officers.',
          ephemeral: true
        });
        console.log("Permission check failed - user not an officer");
        return;
      }
      
      console.log("Permission check passed");
      
      // Update the user that we're starting the cleanup
      await interaction.editReply({
        content: "Starting database cleanup. This may take a moment...",
        ephemeral: true
      });
      
      // Step 1: Get all SteamIDs from the 212th Main Database
      console.log("Fetching SteamIDs from main database");
      const mainDbResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
        range: `'212th Attack Battalion'!F2:F1000`, // SteamID column (F)
      });
      
      const validSteamIds = new Set((mainDbResponse.data.values || []).map(row => row[0]).filter(Boolean));
      console.log(`Found ${validSteamIds.size} valid SteamIDs in main database`);
      
      // Step 2: Get all entries from the Bot sheet
      console.log("Fetching entries from Bot sheet");
      const botDbResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Bot'!A2:C1000`,
      });
      
      const botEntries = botDbResponse.data.values || [];
      console.log(`Found ${botEntries.length} entries in Bot sheet`);
      
      // Step 3: Identify rows to keep (valid entries)
      console.log("Identifying rows to keep");
      const rowsToKeep = [];
      let removedCount = 0;
      
      // Start with row 2 (index 0 in the array)
      for (let i = 0; i < botEntries.length; i++) {
        const row = botEntries[i];
        
        // Skip processing row 2 (index 0) - always keep it
        if (i === 0) {
          rowsToKeep.push(row);
          console.log("Keeping first row (row 2)");
          continue;
        }
        
        // Check if row is empty or has no SteamID
        if (!row || !row[1]) {
          removedCount++;
          console.log(`Removing row ${i+2} - empty or no SteamID`);
          continue;
        }
        
        // Check if SteamID is in the main database
        const steamId = row[1];
        if (validSteamIds.has(steamId)) {
          rowsToKeep.push(row);
          console.log(`Keeping row ${i+2} - SteamID ${steamId} is valid`);
        } else {
          removedCount++;
          console.log(`Removing row ${i+2} - SteamID ${steamId} not found in main database`);
        }
      }
      
      // Step 4: Clear the entire range and rewrite with only valid rows
      // First, clear all data except headers
      console.log("Clearing Bot sheet data");
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Bot'!A2:C1000`,
      });
      
      // Then write back the valid rows
      if (rowsToKeep.length > 0) {
        console.log(`Writing ${rowsToKeep.length} valid rows back to Bot sheet`);
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: `'Bot'!A2:C${1 + rowsToKeep.length}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: rowsToKeep
          }
        });
      }
      
      // Step 5: Report results
      console.log(`Cleanup complete. Removed ${removedCount} entries.`);
      await interaction.editReply({
        content: `Database cleanup complete. Removed ${removedCount} invalid entries.`,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in cleanupdb command:', error);
      
      // Try to respond to the user with the error
      try {
        await interaction.editReply({
          content: `An error occurred: ${error.message}. Please check the console logs for more details.`,
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('Error sending error message to user:', followUpError);
      }
    }
  }
};

// Helper function to check if a user is an officer
async function isUserOfficer(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`,
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === discordId);
    
    // Check if column C has a true value (officer status)
    // Google Sheets API returns "TRUE" as a string, not a boolean
    return userRow && (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}