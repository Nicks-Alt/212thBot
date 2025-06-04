const { SlashCommandBuilder } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restarts the bot (Officer only)'),
    
    async execute(interaction) {
        // Check if user is an officer
        const { isUserOfficer } = require('../utils/isUserOfficer');
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