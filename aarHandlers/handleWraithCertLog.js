const {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');

async function handleWraithCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_wraithcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const participantSteamIdInput = new TextInputBuilder()
        .setCustomId('participantSteamId')
        .setLabel('Participant SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gamemasterInput = new TextInputBuilder()
        .setCustomId('gamemaster')
        .setLabel('Gamemaster (if applicable)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Add inputs to rows
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_wraithcert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
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
        
        // Look up names from the spreadsheet
        const {getTrooperNameFromSteamID} = require('../utils/getTrooperNameFromSteamID');
        const {generateLogID} = require('../utils/generateLogID');
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        const logID = generateLogID();
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#FF8C00' : '#FF8C00') // Green for pass, red for fail
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Examiner', value: examinerName, inline: false },
                { name: 'Examiner SteamID', value: steamId, inline: false },
                { name: 'Participant', value: participantName, inline: false },
                { name: 'Participant SteamID', value: participantSteamId, inline: false },
                { name: 'Certification Type', value: certification, inline: true },
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Result', value: result, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Log ID: ${logID}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
            
            let data = {
                participantName: participantName,
                participantSteamId: participantSteamId,
                gamemaster: gamemaster,
                certification: certification,
                result: result
            }
            const {insertAAR} = require('./insertAAR');
            await insertAAR(eventType, examinerName, steamId, data, logID);
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
        console.error('Error with Wraith certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

module.exports = {handleWraithCertLog}