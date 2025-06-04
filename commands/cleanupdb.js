const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const { isUserOfficer } = require('../utils/isUserOfficer');

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
      // Check if the user is an officer
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
      
      // Step 1: Check if Main sheet is updating by checking if A3:A is blank
      console.log("Checking if Main sheet is updating");
      const checkResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `'Main'!A3:A`,
      });
      
      const checkRows = checkResponse.data.values || [];
      const hasData = checkRows.some(row => row && row[0] && row[0].toString().trim());
      
      if (!hasData) {
        await interaction.editReply({
          content: "⏳ The spreadsheet is currently updating. Please try again in a few minutes.",
          ephemeral: true
        });
        return;
      }
      
      // Step 2: Get all SteamIDs from the 212th Main Database
      console.log("Fetching SteamIDs from main database");
      const mainDbResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `'Main'!D3:D1000`, // SteamID column (D)
      });
      
      const mainDbRows = mainDbResponse.data.values || [];
      
      // Debug: Log the first few rows to verify data format
      console.log("Sample of main database SteamIDs:", mainDbRows?.slice(0, 5));
      
      // Make sure we properly filter out empty values and normalize SteamIDs for comparison
      const validSteamIds = new Set();
      mainDbRows.forEach(row => {
        if (row && row[0] && typeof row[0] === 'string' && row[0].trim()) {
          // Normalize SteamID format (uppercase, trim whitespace)
          const normalizedSteamId = row[0].trim().toUpperCase();
          validSteamIds.add(normalizedSteamId);
          
          // Also add the SteamID without the STEAM_ prefix if it exists
          if (normalizedSteamId.startsWith('STEAM_')) {
            validSteamIds.add(normalizedSteamId.substring(6));
          }
          
          // Also add the SteamID with the STEAM_ prefix if it doesn't exist
          if (!normalizedSteamId.startsWith('STEAM_')) {
            validSteamIds.add(`STEAM_${normalizedSteamId}`);
          }
        }
      });
      
      console.log(`Found ${validSteamIds.size} valid SteamIDs in main database`);
      
      // Step 3: Get all entries from the Users sheet
      console.log("Fetching entries from Users sheet");
      const botDbResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `'Users'!A2:C1000`,
      });
      
      const botDbRows = botDbResponse.data.values || [];
      
      // Debug: Log the first few rows to verify data format
      console.log("Sample of bot database entries:", botDbRows?.slice(0, 5));
      
      const botEntries = botDbRows;
      console.log(`Found ${botEntries.length} entries in Users sheet`);
      
      // Step 4: Identify rows to keep (valid entries) and rows to remove
      console.log("Identifying rows to keep");
      const rowsToKeep = [];
      const rowsToRemove = [];
      
      // Track removed users for the embed
      const removedUsers = [];
      
      // Start with row 2 (index 0 in the array)
      for (let i = 0; i < botEntries.length; i++) {
        const row = botEntries[i];
        
        // Skip empty rows
        if (!row || row.length === 0) {
          console.log(`Skipping empty row at index ${i}`);
          continue;
        }
        
        // Check if row has no SteamID
        if (!row[1] || typeof row[1] !== 'string' || !row[1].trim()) {
          // Keep rows with Discord ID but no SteamID (they might be special entries)
          if (row[0] && typeof row[0] === 'string' && row[0].trim()) {
            rowsToKeep.push(row);
            console.log(`Keeping row ${i+2} - has Discord ID but no SteamID`);
          } else {
            rowsToRemove.push(row);
            console.log(`Removing row ${i+2} - no Discord ID or SteamID`);
          }
          continue;
        }
        
        // Check if SteamID is in the main database
        const steamId = row[1].trim().toUpperCase(); // Normalize for comparison
        const discordId = row[0];
        
        // Try multiple formats of the SteamID for comparison
        const steamIdVariations = [
          steamId,
          steamId.startsWith('STEAM_') ? steamId.substring(6) : steamId,
          !steamId.startsWith('STEAM_') ? `STEAM_${steamId}` : steamId
        ];
        
        // Check if any variation of the SteamID is in the valid set
        const isValidSteamId = steamIdVariations.some(variation => validSteamIds.has(variation));
        
        if (isValidSteamId) {
          rowsToKeep.push(row);
          console.log(`Keeping row ${i+2} - SteamID ${steamId} is valid`);
        } else {
          // Debug: Log the SteamID that wasn't found
          console.log(`SteamID ${steamId} not found in main database. Variations tried:`, steamIdVariations);
          
          rowsToRemove.push(row);
          console.log(`Removing row ${i+2} - SteamID ${steamId} not found in main database`);
          
          // Add to the list of removed users
          if (discordId && steamId) {
            removedUsers.push({
              discordId,
              steamId: row[1] // Use original format for display
            });
          }
        }
      }
      
      // Step 5: Create an embed with the list of removed users
      const embed = new EmbedBuilder()
        .setTitle('Database Cleanup Results')
        .setColor('#FF8C00')
        .setDescription(`Found ${rowsToRemove.length} entries to remove from the database.`)
        .setTimestamp()
        .setFooter({ text: '212th Attack Battalion', iconURL: 'https://i.imgur.com/ushtI24.png' });
      
      // Add the list of removed users to the embed
      if (removedUsers.length > 0) {
        // Sort removed users by Discord ID for consistency
        removedUsers.sort((a, b) => a.discordId.localeCompare(b.discordId));
        
        // Create a string with all removed users (tag them and show SteamID)
        const removedUsersText = removedUsers.map(user => 
          `<@${user.discordId}> (${user.steamId})`
        ).join('\n');
        
        // If the text is too long, split it into multiple fields (Discord has a 1024 character limit per field)
        if (removedUsersText.length <= 1024) {
          embed.addFields({ 
            name: 'Users to be Removed', 
            value: removedUsersText,
            inline: false 
          });
        } else {
          // Split the users into multiple fields
          const chunks = [];
          let currentChunk = [];
          let currentLength = 0;
          
          for (const user of removedUsers) {
            const userText = `<@${user.discordId}> (${user.steamId})`;
            
            // Check if adding this user would exceed the limit
            if (currentLength + userText.length + 1 > 1024) { // +1 for the newline
              chunks.push(currentChunk.join('\n'));
              currentChunk = [userText];
              currentLength = userText.length;
            } else {
              currentChunk.push(userText);
              currentLength += userText.length + 1; // +1 for the newline
            }
          }
          
          // Add the last chunk if it's not empty
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
          }
          
          // Add each chunk as a separate field
          for (let i = 0; i < chunks.length; i++) {
            embed.addFields({ 
              name: i === 0 ? 'Users to be Removed' : `Users to be Removed (continued ${i})`, 
              value: chunks[i],
              inline: false 
            });
          }
        }
      } else {
        embed.addFields({ 
          name: 'Users to be Removed', 
          value: 'No specific users will be removed. The entries to be removed are likely empty or invalid rows.',
          inline: false 
        });
      }
      
      // Step 6: Send the embed to the user BEFORE performing database operations
      console.log(`Sending embed with ${removedUsers.length} users to be removed`);
      await interaction.editReply({
        content: null, // Remove the "Starting database cleanup" message
        embeds: [embed],
        ephemeral: true
      });
      
      // Step 7: Now perform the database operations
      if (rowsToRemove.length > 0) {
        console.log("Starting database operations...");
        
        try {
          // Clear the entire range and rewrite with only valid rows
          console.log("Clearing Users sheet data");
          await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: `'Users'!A2:C1000`,
          });
          
          // Then write back the valid rows
          if (rowsToKeep.length > 0) {
            console.log(`Writing ${rowsToKeep.length} valid rows back to Users sheet`);
            await sheets.spreadsheets.values.update({
              spreadsheetId: process.env.SPREADSHEET_ID,
              range: `'Users'!A2:C${1 + rowsToKeep.length}`,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: rowsToKeep
              }
            });
          }
          
          // Send a new follow-up message instead of trying to edit the previous one
          await interaction.followUp({
            content: `Database cleanup complete! Removed ${rowsToRemove.length} entries.`,
            ephemeral: true
          });
          
        } catch (dbError) {
          console.error("Error performing database operations:", dbError);
          await interaction.followUp({
            content: `An error occurred while updating the database: ${dbError.message}`,
            ephemeral: true
          });
        }
      } else {
        // If no rows to remove, just send a follow-up message
        await interaction.followUp({
          content: "No entries need to be removed from the database.",
          ephemeral: true
        });
      }
      
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