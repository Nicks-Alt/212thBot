const {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');
const { insertAAR } = require('./insertAAR');

async function handleTryoutLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_tryout`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const officerSteamIdInput = new TextInputBuilder()
        .setCustomId('officerSteamId')
        .setLabel('Officer SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const startingCTsInput = new TextInputBuilder()
        .setCustomId('startingCTs')
        .setLabel('Starting CTs')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Number of CTs that started the tryout');

    const endingCTsInput = new TextInputBuilder()
        .setCustomId('endingCTs')
        .setLabel('Ending CTs')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Number of CTs that completed the tryout');

    const passedCTsInput = new TextInputBuilder()
        .setCustomId('passedCTs')
        .setLabel('Name of CT(s) that passed')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Separate names by comma. Use Roster names');

    // Add inputs to rows
    const officerSteamIdRow = new ActionRowBuilder().addComponents(officerSteamIdInput);
    const startingCTsRow = new ActionRowBuilder().addComponents(startingCTsInput);
    const endingCTsRow = new ActionRowBuilder().addComponents(endingCTsInput);
    const passedCTsRow = new ActionRowBuilder().addComponents(passedCTsInput);

    // Add rows to the modal
    modal.addComponents(officerSteamIdRow, startingCTsRow, endingCTsRow, passedCTsRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_tryout`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const officerSteamId = modalSubmission.fields.getTextInputValue('officerSteamId');
        const startingCTs = modalSubmission.fields.getTextInputValue('startingCTs');
        const endingCTs = modalSubmission.fields.getTextInputValue('endingCTs');
        const passedCTs = modalSubmission.fields.getTextInputValue('passedCTs');
        
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
        const name = await getTrooperNameFromSteamID(steamId);
        const officerName = await getTrooperNameFromSteamID(officerSteamId);
        const logID = generateLogID();
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00')
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Submitted by', value: name, inline: false },
                { name: 'SteamID', value: steamId, inline: false },
                { name: 'Officer', value: officerName, inline: false },
                { name: 'Officer SteamID', value: officerSteamId, inline: false },
                { name: 'Starting CTs', value: startingCTs, inline: true },
                { name: 'Ending CTs', value: endingCTs, inline: true },
                { name: 'CTs that passed', value: passedCTs }
            )
            .setTimestamp()
            .setFooter({ text: `Log ID: ${logID}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
            
            let data = {
                officerName: officerName,
                officerSteamId: officerSteamId,
                startingCTs: startingCTs,
                endingCTs: endingCTs,
                passedCTs: passedCTs
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
        console.error('Error with tryout submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

module.exports = {handleTryoutLog}