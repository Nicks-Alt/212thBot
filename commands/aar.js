const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const cacheManager = require('../cacheManager');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to get trooper name from SteamID using cache
async function getTrooperNameFromSteamID(steamID) {
  try {
    // Get the cached main sheet data
    const rows = await cacheManager.getCachedSheetData(
      process.env.MAIN_SPREADSHEET_ID,
      `'212th Attack Battalion'!A2:F1000`,
      'main'
    );

    const result = rows.find(row => row[5] === steamID); // SteamID is column F (index 5)
    
    if (result) {
      return result[4] || 'Unknown'; // Name is in column E (index 4)
    }
    
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching name from spreadsheet:', error);
    return 'Unknown';
  }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aar')
        .setDescription('Create an After Action Report')
        .addSubcommand(subcommand =>
            subcommand
                .setName('s1event')
                .setDescription('Log an S1 Event AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('s2event')
                .setDescription('Log an S2 Event AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('training')
                .setDescription('Log a Training Simulation AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('joint')
                .setDescription('Log a Joint Training Simulation AAR')
                .addStringOption(option =>
                    option
                        .setName('battalion1')
                        .setDescription('First battalion involved in joint training')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Navy', value: 'Navy' },
                            { name: 'Jedi', value: 'Jedi' },
                            { name: 'Advanced Recon Commandos', value: 'Advanced Recon Commandos' },
                            { name: 'Republic Commandos', value: 'Republic Commandos' },
                            { name: '32nd Air Combat Wing', value: '32nd Air Combat Wing' },
                            { name: '104th', value: '104th' },
                            { name: '501st', value: '501st' },
                            { name: '327th', value: '327th' },
                            { name: '41st', value: '41st' },
                            { name: 'Coruscant Guard', value: 'Coruscant Guard' },
                            { name: 'Galactic Marines', value: 'Galactic Marines' },
                            { name: '187th', value: '187th' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('battalion2')
                        .setDescription('Second battalion involved in joint training')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Navy', value: 'Navy' },
                            { name: 'Jedi', value: 'Jedi' },
                            { name: 'Advanced Recon Commandos', value: 'Advanced Recon Commandos' },
                            { name: 'Republic Commandos', value: 'Republic Commandos' },
                            { name: '32nd Air Combat Wing', value: '32nd Air Combat Wing' },
                            { name: '104th', value: '104th' },
                            { name: '501st', value: '501st' },
                            { name: '327th', value: '327th' },
                            { name: '41st', value: '41st' },
                            { name: 'Coruscant Guard', value: 'Coruscant Guard' },
                            { name: 'Galactic Marines', value: 'Galactic Marines' },
                            { name: '187th', value: '187th' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('battalion3')
                        .setDescription('Third battalion involved in joint training')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Navy', value: 'Navy' },
                            { name: 'Jedi', value: 'Jedi' },
                            { name: 'Advanced Recon Commandos', value: 'Advanced Recon Commandos' },
                            { name: 'Republic Commandos', value: 'Republic Commandos' },
                            { name: '32nd Air Combat Wing', value: '32nd Air Combat Wing' },
                            { name: '104th', value: '104th' },
                            { name: '501st', value: '501st' },
                            { name: '327th', value: '327th' },
                            { name: '41st', value: '41st' },
                            { name: 'Coruscant Guard', value: 'Coruscant Guard' },
                            { name: 'Galactic Marines', value: 'Galactic Marines' },
                            { name: '187th', value: '187th' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tryout')
                .setDescription('Log a Tryout AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('basictraining')
                .setDescription('Log a Basic Training AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rankexam')
                .setDescription('Log a Rank Exam AAR')
                .addStringOption(option =>
                    option
                        .setName('group')
                        .setDescription('Group the participant belongs to')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ground Forces', value: 'Ground Forces' },
                            { name: '2nd Airborne Company', value: '2nd Airborne Company' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('testing')
                        .setDescription('Type of test conducted')
                        .setRequired(true)
                        .addChoices(
                            { name: 'NCO - CLG Test', value: 'NCO - CLG Test' },
                            { name: 'NCO - Event Lead', value: 'NCO - Event Lead' },
                            { name: 'NCO - Training Lead', value: 'NCO - Training Lead' },
                            { name: 'NCO - Tryout / BT', value: 'NCO - Tryout / BT' },
                            { name: 'NCO - Written Test', value: 'NCO - Written Test' },
                            { name: 'SNCO - Training Simulation', value: 'SNCO - Training Simulation' },
                            { name: 'Officer - Written Test', value: 'Officer - Written Test' },
                            { name: 'Officer - Interview', value: 'Officer - Interview' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('gccert')
                .setDescription('Log a GC Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass, Fail, or N/A')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' },
                            { name: 'N/A', value: 'N/A' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('2abcert')
                .setDescription('Log a 2AB Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('arfcert')
                .setDescription('Log an ARF Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('certification')
                        .setDescription('Type of ARF certification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Utility', value: 'Utility' },
                            { name: 'Hacking', value: 'Hacking' },
                            { name: 'S&M', value: 'S&M' },
                            { name: 'Recon', value: 'Recon' },
                            { name: 'Speeder', value: 'Speeder' },
                            { name: 'Phase 3', value: 'Phase 3' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('wraithcert')
                .setDescription('Log a Wraith Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('certification')
                        .setDescription('Type of Wraith certification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hacking', value: 'Hacking' },
                            { name: 'A-1', value: 'A-1' },
                            { name: 'A-2', value: 'A-2' },
                            { name: 'A-3', value: 'A-3' },
                            { name: 'Maintenance', value: 'Maintenance' },
                            { name: 'ERC', value: 'ERC' },
                            { name: 'Shield and Hopper', value: 'Shield and Hopper' },
                            { name: 'Tank', value: 'Tank' },
                            { name: 'Bomb Creation', value: 'Bomb Creation' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mediccert')
                .setDescription('Log a Medic Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('certification')
                        .setDescription('Type of Medic certification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Medbay', value: 'Medbay' },
                            { name: 'Field Medicine', value: 'Field Medicine' },
                            { name: 'Wound Treatment', value: 'Wound Treatment' },
                            { name: 'PvE Evaluation', value: 'PvE Evaluation' },
                            { name: 'Cybernetics', value: 'Cybernetics' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('heavycert')
                .setDescription('Log a Heavy Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('certification')
                        .setDescription('Type of Heavy certification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Phase 2', value: 'Phase 2' },
                            { name: 'Phase 3', value: 'Phase 3' },
                            { name: 'Shield Grenade', value: 'Shield Grenade' },
                            { name: 'Grenade Launcher', value: 'Grenade Launcher' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('jsfgoldcert')
                .setDescription('Log a JSF Gold Certification AAR')
                .addStringOption(option =>
                    option
                        .setName('certification')
                        .setDescription('Type of JSF Gold certification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'BT', value: 'BT' },
                            { name: 'CC', value: 'CC' },
                            { name: 'RP', value: 'RP' },
                            { name: 'DFU/VBU Engagement', value: 'DFU/VBU Engagement' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('result')
                        .setDescription('Pass or Fail')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pass', value: 'Pass' },
                            { name: 'Fail', value: 'Fail' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ncosncobt')
                .setDescription('Log an (S)NCO Basic Training AAR')
                .addStringOption(option =>
                    option
                        .setName('completed')
                        .setDescription('Type of training completed')
                        .setRequired(true)
                        .addChoices(
                            { name: 'NCO BT', value: 'NCO BT' },
                            { name: 'SNCO BT', value: 'SNCO BT' }
                        )
                )
    )
        .addSubcommand(subcommand =>
            subcommand
                .setName('btcert')
                .setDescription('Log a Basic Training Certification (SNCO+) AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('gmactivities')
                .setDescription('Log Game Master Activities AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('append')
                .setDescription('Append information to an existing AAR')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('skim')
                .setDescription('View a summary of AARs')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check if the interaction has been deferred (by index.js)
        const isDeferred = interaction.deferred;
        
        // Check if the user is registered
        const isRegistered = await isUserRegistered(interaction.user.id);
        
        if (!isRegistered) {
            // Use the appropriate reply method based on whether the interaction was deferred
            if (isDeferred) {
                return await interaction.editReply({ 
                    content: 'You must be registered to use this command. Please use `/register` with your SteamID to register first.', 
                    ephemeral: true 
                });
            } else {
                return await interaction.reply({ 
                    content: 'You must be registered to use this command. Please use `/register` with your SteamID to register first.', 
                    ephemeral: true 
                });
            }
        }
        
        // Map subcommands to event types
        const eventTypeMap = {
            's1event': 'S1 Event',
            's2event': 'S2 Event',
            'training': 'Training Simulation',
            'joint': 'Joint Training Simulation',
            'tryout': 'Tryout',
            'basictraining': 'Basic Training',
            'rankexam': 'Rank Exam',
            'gccert': 'GC Certification',
            '2abcert': '2AB Certification',
            'arfcert': 'ARF Certification',
            'wraithcert': 'Wraith Certification',
            'mediccert': 'Medic Certification',
            'heavycert': 'Heavy Certification',
            'jsfgoldcert': 'JSF Gold Certification',
            'ncosncobt': '(S)NCO Basic Training',
            'btcert': 'Basic Training Certification (SNCO+)',
            'gmactivities': 'Game Master Activities'
        };

        if (eventTypeMap[subcommand]) {
            const eventType = eventTypeMap[subcommand];
            
            // If the interaction was deferred, we need to edit the reply to remove it
            // before showing a modal
            if (isDeferred) {
                await interaction.deleteReply();
            }
            
            // Handle different event types
            if (subcommand === 's1event' || subcommand === 's2event') {
                await handleStandardEventLog(interaction, eventType);
            } else if (subcommand === 'training') {
                await handleTrainingSimulationLog(interaction, eventType);
            } else if (subcommand === 'joint') {
                // Get the selected battalions
                const battalion1 = interaction.options.getString('battalion1');
                const battalion2 = interaction.options.getString('battalion2');
                const battalion3 = interaction.options.getString('battalion3');
                
                // Collect all selected battalions into an array, filtering out undefined values
                const battalions = [battalion1, battalion2, battalion3].filter(Boolean);
                
                await handleJointTrainingLog(interaction, eventType, battalions);
            } else if (subcommand === 'tryout') {
                await handleTryoutLog(interaction, eventType);
            } else if (subcommand === 'basictraining') {
                await handleBasicTrainingLog(interaction, eventType);
            } else if (subcommand === 'rankexam') {
                await handleRankExamLog(interaction, eventType);
            } else if (subcommand === 'gccert') {
                await handleGCCertLog(interaction, eventType);
            } else if (subcommand === '2abcert') {
                await handle2ABCertLog(interaction, eventType);
            } else if (subcommand === 'arfcert') {
                await handleARFCertLog(interaction, eventType);
            } else if (subcommand === 'wraithcert') {
                await handleWraithCertLog(interaction, eventType);
            } else if (subcommand === 'mediccert') {
                await handleMedicCertLog(interaction, eventType);
            } else if (subcommand === 'heavycert') {
                await handleHeavyCertLog(interaction, eventType);
            } else if (subcommand === 'jsfgoldcert') {
                await handleJSFGoldCertLog(interaction, eventType);
            } else if (subcommand === 'ncosncobt') {
                await handleNCOSNCOBTLog(interaction, eventType);
            } else if (subcommand === 'btcert') {
                await handleBTCertLog(interaction, eventType);
            } else if (subcommand === 'gmactivities') {
                await handleGMActivitiesLog(interaction, eventType);
            } else {
                // For now, handle all other event types with a generic response
                if (isDeferred) {
                    await interaction.editReply({
                        content: `AAR logging for ${eventType} is not yet implemented.`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `AAR logging for ${eventType} is not yet implemented.`,
                        ephemeral: true
                    });
                }
            }
        } else if (subcommand === 'append') {
            if (isDeferred) {
                await interaction.editReply({
                    content: 'The append functionality is not yet implemented.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'The append functionality is not yet implemented.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'skim') {
            if (isDeferred) {
                await interaction.editReply({
                    content: 'The skim functionality is not yet implemented.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'The skim functionality is not yet implemented.',
                    ephemeral: true
                });
            }
        }
    }
};

async function handleStandardEventLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_${eventType.replace(/\s+/g, '_').toLowerCase()}`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gamemasterInput = new TextInputBuilder()
        .setCustomId('gamemaster')
        .setLabel('Gamemaster')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);
    const participantsRow = new ActionRowBuilder().addComponents(participantsInput);
    const summaryRow = new ActionRowBuilder().addComponents(summaryInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, gamemasterRow, participantsRow, summaryRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_${eventType.replace(/\s+/g, '_').toLowerCase()}`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster');
        const participants = modalSubmission.fields.getTextInputValue('participants');
        const summary = modalSubmission.fields.getTextInputValue('summary');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up the name from the spreadsheet using the cached function
        const name = await getTrooperNameFromSteamID(steamId);
        
        // Create an embed for the AAR channel - now matching the training sim style
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00')
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Submitted by', value: name, inline: false },
                { name: 'SteamID', value: steamId, inline: false },
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Participants', value: participants },
                { name: 'Summary', value: summary }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with modal submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handleTrainingSimulationLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_${eventType.replace(/\s+/g, '_').toLowerCase()}`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const leadSteamIdRow = new ActionRowBuilder().addComponents(leadSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);
    const participantsRow = new ActionRowBuilder().addComponents(participantsInput);
    const summaryRow = new ActionRowBuilder().addComponents(summaryInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, leadSteamIdRow, gamemasterRow, participantsRow, summaryRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_${eventType.replace(/\s+/g, '_').toLowerCase()}`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const leadSteamId = modalSubmission.fields.getTextInputValue('leadSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        const participants = modalSubmission.fields.getTextInputValue('participants');
        const summary = modalSubmission.fields.getTextInputValue('summary');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const name = await getTrooperNameFromSteamID(steamId);
        const lead = await getTrooperNameFromSteamID(leadSteamId);
        
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
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Participants', value: participants },
                { name: 'Summary', value: summary }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with training simulation submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handleJointTrainingLog(interaction, eventType, battalions) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_joint_training_simulation`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const leadSteamIdRow = new ActionRowBuilder().addComponents(leadSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);
    const participantsRow = new ActionRowBuilder().addComponents(participantsInput);
    const summaryRow = new ActionRowBuilder().addComponents(summaryInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, leadSteamIdRow, gamemasterRow, participantsRow, summaryRow);

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
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const leadSteamId = modalSubmission.fields.getTextInputValue('leadSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        const participants = modalSubmission.fields.getTextInputValue('participants');
        const summary = modalSubmission.fields.getTextInputValue('summary');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const name = await getTrooperNameFromSteamID(steamId);
        const lead = await getTrooperNameFromSteamID(leadSteamId);
        
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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

async function handleTryoutLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_tryout`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const officerSteamIdRow = new ActionRowBuilder().addComponents(officerSteamIdInput);
    const startingCTsRow = new ActionRowBuilder().addComponents(startingCTsInput);
    const endingCTsRow = new ActionRowBuilder().addComponents(endingCTsInput);
    const passedCTsRow = new ActionRowBuilder().addComponents(passedCTsInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, officerSteamIdRow, startingCTsRow, endingCTsRow, passedCTsRow);

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
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const officerSteamId = modalSubmission.fields.getTextInputValue('officerSteamId');
        const startingCTs = modalSubmission.fields.getTextInputValue('startingCTs');
        const endingCTs = modalSubmission.fields.getTextInputValue('endingCTs');
        const passedCTs = modalSubmission.fields.getTextInputValue('passedCTs');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const name = await getTrooperNameFromSteamID(steamId);
        const officerName = await getTrooperNameFromSteamID(officerSteamId);
        
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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

async function handleBasicTrainingLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_basictraining`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const pvtSteamIdInput = new TextInputBuilder()
        .setCustomId('pvtSteamId')
        .setLabel('PVT\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    // Add inputs to rows
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const pvtSteamIdRow = new ActionRowBuilder().addComponents(pvtSteamIdInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, pvtSteamIdRow);

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
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const pvtSteamId = modalSubmission.fields.getTextInputValue('pvtSteamId');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const instructorName = await getTrooperNameFromSteamID(steamId);
        const pvtName = await getTrooperNameFromSteamID(pvtSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00')
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Instructor', value: instructorName, inline: false },
                { name: 'Instructor SteamID', value: steamId, inline: false },
                { name: 'PVT', value: pvtName, inline: false },
                { name: 'PVT SteamID', value: pvtSteamId, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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

async function handleRankExamLog(interaction, eventType) {
    // Get the options selected in the command
    const group = interaction.options.getString('group');
    const testing = interaction.options.getString('testing');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_rankexam`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const participantSteamIdInput = new TextInputBuilder()
        .setCustomId('participantSteamId')
        .setLabel('Participant SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    // Add inputs to rows
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_rankexam`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Examiner', value: examinerName, inline: false },
                { name: 'Examiner SteamID', value: steamId, inline: false },
                { name: 'Participant', value: participantName, inline: false },
                { name: 'Participant SteamID', value: participantSteamId, inline: false },
                { name: 'Group', value: group, inline: true },
                { name: 'Test Type', value: testing, inline: true },
                { name: 'Result', value: result, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with rank exam submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handleGCCertLog(interaction, eventType) {
    // Get the options selected in the command
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_gccert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const participantSteamIdInput = new TextInputBuilder()
        .setCustomId('participantSteamId')
        .setLabel('Participant SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const certificationInput = new TextInputBuilder()
        .setCustomId('certification')
        .setLabel('Certification/Trial')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gamemasterInput = new TextInputBuilder()
        .setCustomId('gamemaster')
        .setLabel('Gamemaster (if applicable)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Add inputs to rows
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const certificationRow = new ActionRowBuilder().addComponents(certificationInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, certificationRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_gccert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const certification = modalSubmission.fields.getTextInputValue('certification');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Determine the color based on the result
        let embedColor;
        if (result === 'Pass') {
            embedColor = '#00FF00'; // Green for pass
        } else if (result === 'Fail') {
            embedColor = '#FF0000'; // Red for fail
        } else {
            embedColor = '#FF8C00'; // Standard orange color for N/A
        }
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(embedColor)
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Examiner', value: examinerName, inline: false },
                { name: 'Examiner SteamID', value: steamId, inline: false },
                { name: 'Participant', value: participantName, inline: false },
                { name: 'Participant SteamID', value: participantSteamId, inline: false },
                { name: 'Certification/Trial', value: certification, inline: false },
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Result', value: result, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with GC certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handle2ABCertLog(interaction, eventType) {
    // Get the options selected in the command
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_2abcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_2abcert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Examiner', value: examinerName, inline: false },
                { name: 'Examiner SteamID', value: steamId, inline: false },
                { name: 'Participant', value: participantName, inline: false },
                { name: 'Participant SteamID', value: participantSteamId, inline: false },
                { name: 'Gamemaster', value: gamemaster, inline: false },
                { name: 'Result', value: result, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with 2AB certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handleARFCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_arfcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    // Inside handleARFCertLog function, after showing the modal
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_arfcert`;

    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with ARF certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}
async function handleWraithCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_wraithcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

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
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
async function handleMedicCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_mediccert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_mediccert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with Medic certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}
async function handleHeavyCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_heavycert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_heavycert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with Heavy certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}
async function handleJSFGoldCertLog(interaction, eventType) {
    // Get the options selected in the command
    const certification = interaction.options.getString('certification');
    const result = interaction.options.getString('result');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_jsfgoldcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_jsfgoldcert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const examinerName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor(result === 'Pass' ? '#00FF00' : '#FF0000') // Green for pass, red for fail
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with JSF Gold certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}
async function handleNCOSNCOBTLog(interaction, eventType) {
    // Get the options selected in the command
    const completed = interaction.options.getString('completed');
    
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_ncosncobt`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const participantSteamIdRow = new ActionRowBuilder().addComponents(participantSteamIdInput);
    const gamemasterRow = new ActionRowBuilder().addComponents(gamemasterInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, participantSteamIdRow, gamemasterRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_ncosncobt`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const participantSteamId = modalSubmission.fields.getTextInputValue('participantSteamId');
        const gamemaster = modalSubmission.fields.getTextInputValue('gamemaster') || 'N/A';
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const instructorName = await getTrooperNameFromSteamID(steamId);
        const participantName = await getTrooperNameFromSteamID(participantSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00') // Standard orange color
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Instructor', value: instructorName, inline: false },
                { name: 'Instructor SteamID', value: steamId, inline: false },
                { name: 'Participant', value: participantName, inline: false },
                { name: 'Participant SteamID', value: participantSteamId, inline: false },
                { name: 'Training Completed', value: completed, inline: true },
                { name: 'Gamemaster', value: gamemaster, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with (S)NCO BT submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}
// Add the handler function for Basic Training Certification (SNCO+)
async function handleBTCertLog(interaction, eventType) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_btcert`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const cplSteamIdInput = new TextInputBuilder()
        .setCustomId('cplSteamId')
        .setLabel('CPL\'s SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    // Add inputs to rows
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const cplSteamIdRow = new ActionRowBuilder().addComponents(cplSteamIdInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, cplSteamIdRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    
    // Set up a collector for the modal submit interaction
    const filter = i => i.customId === `aar_log_btcert`;
    
    try {
        // Wait for the modal to be submitted
        const modalSubmission = await interaction.awaitModalSubmit({
            filter,
            time: 300000 // 5 minutes
        });
        
        // Get the values from the modal
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const cplSteamId = modalSubmission.fields.getTextInputValue('cplSteamId');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up names from the spreadsheet
        const instructorName = await getTrooperNameFromSteamID(steamId);
        const cplName = await getTrooperNameFromSteamID(cplSteamId);
        
        // Create an embed for the AAR channel
        const aarEmbed = new EmbedBuilder()
            .setTitle(`After Action Report`)
            .setDescription(`${eventType}`)
            .setColor('#FF8C00') // Standard orange color
            .setThumbnail('https://i.imgur.com/ushtI24.png')
            .addFields(
                { name: 'Instructor', value: instructorName, inline: false },
                { name: 'Instructor SteamID', value: steamId, inline: false },
                { name: 'CPL', value: cplName, inline: false },
                { name: 'CPL SteamID', value: cplSteamId, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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
        console.error('Error with BT certification submission:', error);
        // If the error is due to timeout, we don't need to do anything
        // as the modal will just close
    }
}

async function handleGMActivitiesLog(interaction, eventType) {
    // Create the modal without the description field
    const modal = new ModalBuilder()
        .setCustomId(`aar_log_gmactivities`)
        .setTitle(`AAR: ${eventType}`);

    // Add the components to the modal
    const steamIdInput = new TextInputBuilder()
        .setCustomId('steamId')
        .setLabel('Your SteamID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

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
    const steamIdRow = new ActionRowBuilder().addComponents(steamIdInput);
    const activityTypeRow = new ActionRowBuilder().addComponents(activityTypeInput);
    const hostRow = new ActionRowBuilder().addComponents(hostInput);

    // Add rows to the modal
    modal.addComponents(steamIdRow, activityTypeRow, hostRow);

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
        const steamId = modalSubmission.fields.getTextInputValue('steamId');
        const activityType = modalSubmission.fields.getTextInputValue('activityType');
        const host = modalSubmission.fields.getTextInputValue('host');
        
        // Defer the reply to give time for spreadsheet lookup
        await modalSubmission.deferReply({ ephemeral: true });
        
        // Look up name from the spreadsheet
        const gmName = await getTrooperNameFromSteamID(steamId);
        
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
            .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        // Send the embed to the AAR channel
        const aarChannelId = '1371424870134579300'; // You'll change this later
        const aarChannel = interaction.client.channels.cache.get(aarChannelId);
        
        if (aarChannel) {
            await aarChannel.send({ embeds: [aarEmbed] });
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

// Function to check if a user is registered (copied from index.js)
async function isUserRegistered(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:B`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    const nonEmptyRows = rows.filter(row => row.length > 0 && row[0]);
    const existingEntry = nonEmptyRows.find(row => row[0] === discordId);
    
    return !!existingEntry; // Convert to boolean
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false; // Default to not registered on error
  }
}
