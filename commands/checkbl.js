const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

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
    const steamIdToCheck = interaction.options.getString('steamid');

    try {
      // Remove the deferReply since index.js already does this
      // await interaction.deferReply({ ephemeral: true });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Blacklist'!A2:F1000`, // Make sure this tab name exists
      });

      const rows = response.data.values || [];

      const result = rows.find(row => row[2] === steamIdToCheck); // SteamID is column C

      let embed;

      if (!result) {
        embed = new EmbedBuilder()
          .setTitle('✅ Not Blacklisted')
          .setColor(0x00ff00)
          .setDescription(`SteamID \`${steamIdToCheck}\` is **not currently blacklisted.**`)
          .setFooter({ text: 'Blacklist Checker' })
          .setTimestamp();
      } else {
        const [date = 'N/A', name = 'N/A', , reason = 'N/A', officer = 'N/A', status = 'Unknown'] = result;
        const isActive = status.toLowerCase() === 'active';
        const embedColor = isActive ? 0xff0000 : 0x00ff00;

        embed = new EmbedBuilder()
          .setTitle(isActive ? '⛔ Active Blacklist' : '✅ Not Blacklisted / Appealed')
          .setColor(embedColor)
          .setDescription(
            `**Name:** ${name}\n` +
            `**SteamID:** ${steamIdToCheck}\n` +
            `**Date:** ${date}\n` +
            `**Reason:** ${reason}\n` +
            `**Officer:** ${officer}\n` +
            `**Status:** ${status}`
          )
          .setFooter({ text: 'Blacklist Checker' })
          .setTimestamp();
      }

      await interaction.editReply({ embeds: [embed], ephemeral: true }); // Changed from editReply to editReply
    } catch (error) {
      console.error('Sheets error:', error); // Logs the actual error
      await interaction.editReply({
        content: '⚠️ Something went wrong while accessing the sheet or formatting the reply.',
        ephemeral: true,
      });
    }
  },
};
