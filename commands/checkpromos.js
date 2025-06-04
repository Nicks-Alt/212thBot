const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const moment = require('moment');
require('dotenv').config();

// Configure Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: './service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkpromos')
        .setDescription('Check eligible votes and recent voting messages'),

    async execute(interaction) {
        // The interaction is already deferred in index.js
        
        try {
            // Check if user is an officer
            console.log("Checking if user is an officer");
            const { isUserOfficer } = require('../utils/isUserOfficer');
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
            
            // Step 1: Get eligible members from the spreadsheets
            const {getEligibleMembers} = require('../utils/getEligibleMembers');
            const eligibleMembers = await getEligibleMembers();
            
            // Step 2: Check for voting messages in the specified channel
            const {checkVotingMessages} = require('../utils/checkVotingMessages');
            const votingMessages = await checkVotingMessages(interaction.client);
            
            // Step 3: Check for NCO testing messages
            const {checkNCOTestingMessages} = require('../utils/checkNCOTestingMessages');
            const ncoTestingMessages = await checkNCOTestingMessages(interaction.client);
            
            // Step 4: Create and send the embed
            const {createEmbed} = require('../utils/createEmbed');
            const embed = createEmbed(eligibleMembers, votingMessages, ncoTestingMessages);
            
            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error executing checkpromos command:', error);
            await interaction.editReply({
                content: `An error occurred while checking eligible votes: ${error.message}`,
                ephemeral: true
            });
        }
    }
};