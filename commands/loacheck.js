const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const { isUserOfficer } = require('../utils/isUserOfficer');

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

      // Get data from the Main sheet
      const mainResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `'Main'!A3:L1000`, // Adjusted range to match Main sheet structure
      });

      const mainRows = mainResponse.data.values || [];

      // Get data from the Users sheet
      const usersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `'Users'!A2:C1000`,
      });

      const usersRows = usersResponse.data.values || [];
      
      // Valid ranks to check
      const validRanks = [
        'SGT', 'SSG', 'SFC', 'MSG', '1SG', 'SGM', 'WO', 
        '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'XO', 'CDR'
      ];
      
      // First, identify members with active LOAs
      const currentLoaMembers = mainRows.filter(row => {
        if (!row || row.length < 12) return false;
        const rank = row[0];
        if (!validRanks.includes(rank)) return false;
        const loaStatus = row[11];
        return loaStatus && loaStatus.trim() !== "" && loaStatus !== "N/A";
      });
      
      // Create a set of names that are on LOA to exclude from inactivity list
      const namesOnLoa = new Set(currentLoaMembers.map(row => `${row[0]} ${row[2]}`));
      
      // Filter for high inactivity
      const inactiveMembers = mainRows.filter(row => {
        if (!row || row.length < 11) return false;
        const rank = row[0];
        if (!validRanks.includes(rank)) return false;
        const fullName = `${row[0]} ${row[2]}`;
        if (namesOnLoa.has(fullName)) return false;
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
          const rank = row[0];
          const name = row[2];
          const steamId = row[3] || 'Unknown';
          const daysSinceLastOn = row[10];
          
          // Find the user in Users sheet by steamid
          const userRow = usersRows.find(userRow => userRow[1] === steamId);
          const displayName = userRow ? `<@${userRow[0]}>` : name;
          
          return `${rank} ${displayName} (${steamId}) - ${daysSinceLastOn} days since last online`;
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
      
      // Add current LOA members to the embed
      if (currentLoaMembers.length > 0) {
        const currentLoaList = currentLoaMembers.map(row => {
          const rank = row[0];
          const name = row[2];
          const steamId = row[3] || 'Unknown';
          const loaReason = row[11];
          
          let daysRemaining = "Unknown duration";
          const dayMatch = loaReason.match(/(\d+)[\s-]?[Dd]ay/);
          if (dayMatch && dayMatch[1]) {
            daysRemaining = `${dayMatch[1]} days remaining`;
          }
          
          // Find the user in Users sheet by steamid
          const userRow = usersRows.find(userRow => userRow[1] === steamId);
          const displayName = userRow ? `<@${userRow[0]}>` : name;
          
          return `${rank} ${displayName} (${steamId}) - ${daysRemaining}`;
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