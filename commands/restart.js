const { SlashCommandBuilder } = require('discord.js');
const { exec } = require('child_process');

// Function to check if a user is an officer using the cache
async function isUserOfficer(discordId) {
  try {
    // Get the cached officer data
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C`,
      'registrationdata',
      false
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
        .setName('restart')
        .setDescription('Restarts the bot (Officer only)'),
    
    async execute(interaction) {
        // Check if user is an officer
        const isOfficer = await isUserOfficer(interaction.user.id);
        
        if (!isOfficer) {
            return interaction.editReply({ 
                content: 'You do not have permission to use this command. Only officers can restart the bot.', 
                ephemeral: true 
            });
        }

        await interaction.editReply({ content: 'Restarting the bot...', ephemeral: true });
        
        console.log(`Officer ${interaction.user.tag} is restarting the bot`);
        
        // Execute the restart command with a small delay to ensure the reply is sent
        setTimeout(() => {
            exec('pm2 reload index.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Restart error: ${error}`);
                    return;
                }
                console.log(`Bot reloaded: ${stdout}`);
                if (stderr) {
                    console.error(`Reload stderr: ${stderr}`);
                }
            });
        }, 2000);
    },
};