// Adds reactions to voting messages


const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the message is in one of the voting channels
        const ncoVotingChannelId = process.env.NCO_VOTING_CHANNEL_ID;
        const officerVotingChannelId = process.env.VOTING_CHANNEL_ID;

        if (message.channel.id === ncoVotingChannelId || message.channel.id === officerVotingChannelId) {
            try {
                // Add reactions to the message
                await message.react('<:yes:755585543097679951>'); // Yes
                await message.react('<:no:755586562305163415>'); // No
                
                console.log(`Added voting reactions to message ${message.id} in ${message.channel.name}`);
            } catch (error) {
                console.error('Error adding reactions to voting message:', error);
            }
        }
    },
};