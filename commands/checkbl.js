const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Function to check if a user is an officer using the cache
async function isUserOfficer(discordId) {
  try {
    // Get the cached officer data
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C`,
      'registrationdata'
    );

    const userRow = rows.find(row => row[0] === discordId);
    
    // If user found and officer status is true (column C, index 2)
    return userRow && userRow.length > 2 && 
           (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

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

      // Get blacklist data from cache
      console.log(`Checking blacklist for SteamID: ${steamIdToCheck}`);
      const rows = await cacheManager.getCachedSheetData(
        process.env.OFFICER_SPREADSHEET_ID,
        `'Blacklist'!A:F`,
        'blacklist'
      );

      console.log(`Got ${rows.length} rows from blacklist cache`);
      
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
