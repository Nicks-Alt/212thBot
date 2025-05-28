const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const cacheManager = require('../cacheManager');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loacheck')
    .setDescription('Check for members with high inactivity or active LOAs'),

  async execute(interaction) {
    try {
      // Check if the user is an officer
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'This command is only available to officers.',
          ephemeral: true
        });
        return;
      }

      // Get data from the 212th Attack Battalion sheet using cache with the new key
      const rows = await cacheManager.getCachedSheetData(
        process.env.MAIN_SPREADSHEET_ID,
        `'212th Attack Battalion'!C:N`,
        'mainsheetdata'
      );
      
      // Valid ranks to check
      const validRanks = [
        'SGT', 'SSG', 'SFC', 'MSG', '1SG', 'SGM', 'WO', 
        '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'XO', 'CDR'
      ];
      
      // First, identify members with active LOAs
      const currentLoaMembers = rows.filter(row => {
        // Check if row has enough columns
        if (row.length < 12) return false;
        
        // Check rank (Column C, index 0 after adjustment)
        const rank = row[0];
        if (!validRanks.includes(rank)) return false;
        
        // Check current LOA status (Column N, index 11 after adjustment)
        const loaStatus = row[11];
        return loaStatus && loaStatus.trim() !== "" && loaStatus !== "N/A";
      });
      
      // Create a set of names that are on LOA to exclude from inactivity list
      const namesOnLoa = new Set(currentLoaMembers.map(row => `${row[0]} ${row[2]}`)); // Rank + Name
      
      // Filter for high inactivity (Column M > 6) and valid ranks (Column C)
      // Exclude members who are on LOA
      const inactiveMembers = rows.filter(row => {
        // Check if row has enough columns
        if (row.length < 11) return false;
        
        // Check rank (Column C, index 0 after adjustment)
        const rank = row[0];
        if (!validRanks.includes(rank)) return false;
        
        // Skip if on LOA
        const fullName = `${row[0]} ${row[2]}`; // Rank + Name
        if (namesOnLoa.has(fullName)) return false;
        
        // Check days since last on (Column M, index 10 after adjustment)
        const daysSinceLastOn = parseInt(row[10]);
        return !isNaN(daysSinceLastOn) && daysSinceLastOn > 6;
      });
      
      // Create an embed to display the results
      const embed = new EmbedBuilder()
        .setTitle('212th Attack Battalion - LOA Check')
        .setColor('#FF8C00')
        .setThumbnail('https://i.imgur.com/ushtI24.png')
        .setTimestamp()
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });
      
      // Add inactive members to the embed
      if (inactiveMembers.length > 0) {
        const inactiveList = inactiveMembers.map(row => {
          const rank = row[0];  // Column C, index 0 after adjustment
          const name = row[2];  // Column E, index 2 after adjustment
          const steamId = row[3] || 'Unknown';  // Column F, index 3 after adjustment (name index + 1)
          const daysSinceLastOn = row[10];  // Column M, index 10 after adjustment
          return `${rank} ${name} (${steamId}) - ${daysSinceLastOn} days since last online`;
        }).join('\n');
        
        embed.addFields({ 
          name: 'Inactivity (7+ days)', 
          value: inactiveList || 'None', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: 'Inactivity (7+ days)', 
          value: 'None', 
          inline: false 
        });
      }
      
      // Add current LOA members to the embed with days remaining
      if (currentLoaMembers.length > 0) {
        const currentLoaList = currentLoaMembers.map(row => {
          const rank = row[0];  // Column C, index 0 after adjustment
          const name = row[2];  // Column E, index 2 after adjustment
          const steamId = row[3] || 'Unknown';  // Column F, index 3 after adjustment (name index + 1)
          const loaReason = row[11];  // Column N, index 11 after adjustment
          
          // Parse the LOA text to extract days remaining
          let daysRemaining = "Unknown duration";
          
          // Common formats: "X Day LOA", "X day LOA", "X-day LOA"
          const dayMatch = loaReason.match(/(\d+)[\s-]?[Dd]ay/);
          if (dayMatch && dayMatch[1]) {
            daysRemaining = `${dayMatch[1]} days remaining`;
          }
          
          return `${rank} ${name} (${steamId}) - ${daysRemaining}`;
        }).join('\n');
        
        embed.addFields({ 
          name: 'Current LOAs', 
          value: currentLoaList || 'None', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: 'Current LOAs', 
          value: 'None', 
          inline: false 
        });
      }
      
      // Send the embed
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing LOA check command:', error);
      await interaction.editReply({
        content: `An error occurred while checking LOAs: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// Helper function to check if a user is an officer using cache
async function isUserOfficer(discordId) {
  try {
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C1000`,
      'officer'
    );

    const userRow = rows.find(row => row[0] === discordId);
    
    // Check if column C has a true value (officer status)
    // Google Sheets API returns "TRUE" as a string, not a boolean
    return userRow && (userRow[2] === true || 
                       userRow[2] === "TRUE" || 
                       userRow[2] === "true" || 
                       userRow[2] === 1 ||
                       String(userRow[2]).toLowerCase() === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}