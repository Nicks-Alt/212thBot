const {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');
const { insertAAR } = require('./insertAAR');

async function handleGMActivitiesLog(interaction, eventType) {
    // Create the modal without the description field
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_gmactivities`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const activityTypeInput = new TextInputBuilder()
        .setCustomId('activityType')
        .setLabel('What type of activity')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const hostInput = new TextInputBuilder()
        .setCustomId('host')
        .setLabel('Who was the host')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    // Add inputs to rows
    const activityTypeRow = new ActionRowBuilder().addComponents(activityTypeInput);
    const hostRow = new ActionRowBuilder().addComponents(hostInput);

    // Add rows to the modal
    modal.addComponents(activityTypeRow, hostRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_gmactivities`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const activityType = modalSubmission.fields.getTextInputValue('activityType');
        const host = modalSubmission.fields.getTextInputValue('host');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Get user's SteamID from registration
        const { getUserSteamID } = require('../utils/registrationCheck');
        const steamId = await getUserSteamID(interaction.user.id);
        
        if (!steamId) {
            await modalSubmission.editReply({
                content: 'Error: Could not find your SteamID in the registration system. Please contact an administrator.',
                ephemeral: true
            });
            return;
        }
        
        // Look up name from the spreadsheet
        const {getTrooperNameFromSteamID} = require('../utils/getTrooperNameFromSteamID');
        const {generateLogID} = require('../utils/generateLogID');
        const gmName = await getTrooperNameFromSteamID(steamId);
        const logID = generateLogID();
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00') // Standard orange color
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Game Master', value: gmName, inline: false },
                { name: 'Game Master SteamID', value: steamId, inline: false },
                { name: 'Activity Type', value: activityType, inline: false },
                { name: 'Host', value: host, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Log ID: ${logID}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
            
            let data = {
                activityType: activityType,
                host: host
            }
            const {insertAAR} = require('./insertAAR');
            await insertAAR(eventType, gmName, steamId, data, logID);
            await modalSubmission.editReply({
                content: `Your AAR for ${eventType} has been submitted successfully.`,
                ephemeral: true
            });
        } else {
            console.error(`AAR channel with ID ${aarChannelId} not found`);
            // Notify the user that the AAR was submitted but not posted to the channel
            await modalSubmission.editReply({
                content: 'Note: Your AAR was submitted but could not be posted to the AAR channel. Please notify an administrator.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error with GM activities submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

module.exports = {handleGMActivitiesLog}