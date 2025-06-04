const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const { isUserOfficer } = require('../utils/isUserOfficer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkbl')
    .setDescription('Check if a SteamID exists and retrieve blacklist info')
    .addStringOption(option =>
      option.setName('steamid')
        .setDescription('The SteamID to check')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      
      const steamIdToCheck = interaction.options.getString('steamid');

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

      // Get blacklist data directly from the spreadsheet
      console.log(`Checking blacklist for SteamID: ${steamIdToCheck}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'BL'!A:F`,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.log('No blacklist data found in spreadsheet');
        return await interaction.editReply({
          content: '⚠️ No blacklist data found.',
          ephemeral: true,
        });
      }

      console.log(`Got ${rows.length} rows from blacklist`);
      
      // Find the row with matching SteamID (column C, index 2)
      const result = rows.find(row => row && row[2] === steamIdToCheck);

      // Check if the user is an officer
      const isOfficer = await isUserOfficer(interaction.user.id);
      console.log(`User ${interaction.user.id} is officer: ${isOfficer}`);

      let embed;

      if (!result) {
        console.log(`SteamID ${steamIdToCheck} not found in blacklist`);
        embed = new EmbedBuilder()
          .setTitle('✅ Not Blacklisted')
          .setColor(0x00ff00)
          .setDescription(`SteamID \`${steamIdToCheck}\` is **not currently blacklisted.**`)
          .setFooter({ text: 'Blacklist Checker' })
          .setTimestamp();
      } else {
        console.log(`Found blacklist entry for SteamID: ${steamIdToCheck}`);
        // Updated indices: officer is column E (index 4), status is column F (index 5)
        const [date = 'N/A', name = 'N/A', , reason = 'N/A', officer = 'N/A', status = 'Unknown'] = result;
        const isActive = status && status.toLowerCase() === 'active';
        const embedColor = isActive ? 0xff0000 : 0x00ff00;

        // Create description based on officer status
        let description;
        if (isOfficer) {
          // Officers see all information including reason
          description = 
            `**Name:** ${name}\n` +
            `**SteamID:** ${steamIdToCheck}\n` +
            `**Date:** ${date}\n` +
            `**Reason:** ${reason}\n` +
            `**Officer:** ${officer}\n` +
            `**Status:** ${status}`;
        } else {
          // Non-officers don't see the reason
          description = 
            `**Name:** ${name}\n` +
            `**SteamID:** ${steamIdToCheck}\n` +
            `**Date:** ${date}\n` +
            `**Status:** ${status}`;
        }

        embed = new EmbedBuilder()
          .setTitle(isActive ? '⛔ Active Blacklist' : '✅ Not Blacklisted / Appealed')
          .setColor(embedColor)
          .setDescription(description)
          .setFooter({ text: 'Blacklist Checker' })
          .setTimestamp();
      }

      // Always use editReply since the interaction is already deferred in index.js
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error checking blacklist:', error);
      
      // Always use editReply since the interaction is already deferred in index.js
      await interaction.editReply({
        content: '⚠️ Something went wrong while accessing the blacklist data.',
        ephemeral: true,
      });
    }
  },
};
