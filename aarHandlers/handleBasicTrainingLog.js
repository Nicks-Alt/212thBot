const {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');
const { insertAAR } = require('./insertAAR');

async function handleBasicTrainingLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_basictraining`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const pvtSteamIdInput = new TextInputBuilder()
        .setCustomId('pvtSteamId')
        .setLabel('PVT\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const pvt2SteamIdInput = new TextInputBuilder()
        .setCustomId('pvt2SteamId')
        .setLabel('PVT #2\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const pvt3SteamIdInput = new TextInputBuilder()
        .setCustomId('pvt3SteamId')
        .setLabel('PVT #3\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const pvt4SteamIdInput = new TextInputBuilder()
        .setCustomId('pvt4SteamId')
        .setLabel('PVT #4\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Add inputs to rows
    const pvtSteamIdRow = new ActionRowBuilder().addComponents(pvtSteamIdInput);
    const pvt2SteamIdRow = new ActionRowBuilder().addComponents(pvt2SteamIdInput);
    const pvt3SteamIdRow = new ActionRowBuilder().addComponents(pvt3SteamIdInput);
    const pvt4SteamIdRow = new ActionRowBuilder().addComponents(pvt4SteamIdInput);

    // Add rows to the modal
    modal.addComponents(pvtSteamIdRow, pvt2SteamIdRow, pvt3SteamIdRow, pvt4SteamIdRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_basictraining`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const pvtSteamId = modalSubmission.fields.getTextInputValue('pvtSteamId');
        const pvt2SteamId = modalSubmission.fields.getTextInputValue('pvt2SteamId') || '';
        const pvt3SteamId = modalSubmission.fields.getTextInputValue('pvt3SteamId') || '';
        const pvt4SteamId = modalSubmission.fields.getTextInputValue('pvt4SteamId') || '';
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
        const {checkBattalionEndpoint} = require('../utils/apiLookup');
        const {generateLogID} = require('../utils/generateLogID');
        
        const instructorName = await getTrooperNameFromSteamID(steamId);
        let pvtName;
        let pvt = await checkBattalionEndpoint('212th', pvtSteamId);
        if (!pvt){
            pvt = await checkBattalionEndpoint('212AB', pvtSteamId);
            pvtName = pvt.name;
        }
        else{
            pvtName = pvt.name;
        }
        let pvt2Name;
        if (pvt2SteamId){
            
            let pvt2 = await checkBattalionEndpoint('212th', pvt2SteamId);
            if (!pvt2){
                pvt2 = await checkBattalionEndpoint('212AB', pvt2SteamId);
                pvt2Name = pvt2.name;
            }
            else{
                pvt2Name = pvt2.name;
            }
        }
        let pvt3Name;
        if (pvt3SteamId){
            
            let pvt3 = await checkBattalionEndpoint('212th', pvt3SteamId);
            if (!pvt3){
                pvt3 = await checkBattalionEndpoint('212AB', pvt3SteamId);
                pvt3Name = pvt3.name;
            }
            else{
                pvt3Name = pvt3.name;
            }
        }
        let pvt4Name;
        if (pvt4SteamId){
            
            let pvt4 = await checkBattalionEndpoint('212th', pvt4SteamId);
            if (!pvt4){
                pvt4 = await checkBattalionEndpoint('212AB', pvt4SteamId);
                pvt4Name = pvt4.name;
            }
            else{
                pvt4Name = pvt4.name;
            }
        }
        
        const logID = generateLogID();
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00')
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Instructor', value: instructorName, inline: false },
                { name: 'Instructor SteamID', value: steamId, inline: false },
                { name: 'PVT #1', value: pvtName, inline: false },
                { name: 'PVT #1 SteamID', value: pvtSteamId, inline: false },
                
            )
            .setTimestamp()
            .setFooter({ text: `Log ID: ${logID}`, iconURL: interaction.user.displayAvatarURL() });
        if (pvt2SteamId) {
            aarEmbed.addFields(
                { name: 'PVT #2', value: pvt2Name, inline: false },
                { name: 'PVT #2 SteamID', value: pvt2SteamId, inline: false },
            )
        }
        if (pvt3SteamId) {
            aarEmbed.addFields(
                { name: 'PVT #3', value: pvt3Name, inline: false },
                { name: 'PVT #3 SteamID', value: pvt3SteamId, inline: false },
            )
        }
        if (pvt4SteamId) {
            aarEmbed.addFields(
                { name: 'PVT #4', value: pvt4Name, inline: false },
                { name: 'PVT #4 SteamID', value: pvt4SteamId, inline: false },
            )
        }
        // Send the embed to the AAR channel
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
            
            let data = {
                steamId: steamId,
                pvtNames: [pvtName, pvt2Name, pvt3Name, pvt4Name],
                pvtSteamIds: [pvtSteamId, pvt2SteamId, pvt3SteamId, pvt4SteamId],
            }
            const {insertAAR} = require('./insertAAR');
            await insertAAR(eventType, instructorName, steamId, data, logID);
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
        console.error('Error with basic training submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

module.exports = {handleBasicTrainingLog}