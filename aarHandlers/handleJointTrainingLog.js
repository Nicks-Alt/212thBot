const {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');

async function handleJointTrainingLog(interaction, eventType, battalions) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_joint_training_simulation`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const leadInput = new TextInputBuilder()
        .setCustomId('lead')
        .setLabel('Lead')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const leadSteamIdInput = new TextInputBuilder()
        .setCustomId('leadSteamId')
        .setLabel('Lead SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gamemasterInput = new TextInputBuilder()
        .setCustomId('gamemaster')
        .setLabel('Gamemaster (if applicable)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const participantsInput = new TextInputBuilder()
        .setCustomId('participants')
        .setLabel('Participants')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Separate names by comma. Use Roster names (e.g., Martinez, Chubby, Cayde)');

    const summaryInput = new TextInputBuilder()
        .setCustomId('summary')
        .setLabel('Summary')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    // Add inputs to rows
    const leadRow = new ActionRowBuilder().addComponents(leadInput);
    const leadSteamIdRow = new ActionRowBuilder().addComponents(leadSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);
    const participantsRow = new ActionRowBuilder().addComponents(participantsInput);
    const summaryRow = new ActionRowBuilder().addComponents(summaryInput);

    // Add rows to the modal
    modal.addComponents(leadRow, leadSteamIdRow, gamemasterRow, participantsRow, summaryRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_joint_training_simulation`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const lead = modalSubmission.fields.getTextInputValue('lead');
        const leadSteamId = modalSubmission.fields.getTextInputValue('leadSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        const participants = modalSubmission.fields.getTextInputValue('participants');
        const summary = modalSubmission.fields.getTextInputValue('summary');
        
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
        const name = await getTrooperNameFromSteamID(steamId);
        const logID = generateLogID();
        
        // Format the battalions list
        const battalionsText = battalions.length > 0 
            ? battalions.join(', ') 
            : 'No battalions specified';
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00')
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Submitted by', value: name, inline: false },
                { name: 'SteamID', value: steamId, inline: false },
                { name: 'Lead', value: lead, inline: false },
                { name: 'Lead SteamID', value: leadSteamId, inline: false },
                { name: 'Battalions', value: battalionsText, inline: false },
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Participants', value: participants },
                { name: 'Summary', value: summary }
            )
            .setTimestamp()
            .setFooter({ text: `Log ID: ${logID}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
            
            let data = {
                gamemaster: gamemaster,
                lead: lead,
                leadSteamId: leadSteamId,
                participants: participants,
                summary: summary,
                battalions: battalions.join(', ') // convert array to string
            }
            const {insertAAR} = require('./insertAAR');
            await insertAAR(eventType, name, steamId, data, logID);
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
        console.error('Error with joint training submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

module.exports = {handleJointTrainingLog}