const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');

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
                            { name: 'NCO - Combat Leadership Guide Test', value: 'NCO - Combat Leadership Guide Test' },
                            { name: 'NCO - Event Lead', value: 'NCO - Event Lead' },
                            { name: 'NCO - Training Lead', value: 'NCO - Training Lead' },
                            { name: 'NCO - Tryout / BT', value: 'NCO - Tryout / BT' },
                            { name: 'SNCO - Written Test', value: 'SNCO - Written Test' },
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
                .setName('participants')
                .setDescription('Add or remove participants to an existing AAR log')
                .addStringOption(option =>
                    option.setName('logid')
                        .setDescription('The Log ID (message ID) to add participants to')
                        .setRequired(true)),
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        console.log(`Subcommand: ${subcommand}`);
        // Map subcommands to event types
        const eventTypeMap = {
            's1event': 'Server 1 Event',
            's2event': 'Server 2 Event',
            'training': 'Training Simulation',
            'joint': 'Joint Training Simulation',
            'tryout': 'Tryout',
            'basictraining': 'Basic Training',
            'rankexam': 'Rank Exam',
            'gccert': 'GC Certifications',
            '2abcert': '2AB Certifications',
            'arfcert': 'ARF Certifications',
            'wraithcert': 'Wraith Certifications',
            'mediccert': 'Medic Certifications',
            'heavycert': 'Heavy Certifications',
            'jsfgoldcert': 'JSF Gold Certifications',
            'ncosncobt': '(S)NCO Basic Training',
            'btcert': 'Basic Training Certification (SNCO+)',
            'gmactivities': 'Game Master Activities'
        };
        if (eventTypeMap[subcommand]) {
            const eventType = eventTypeMap[subcommand];
            // Handle different event types
            if (subcommand === 's1event' || subcommand === 's2event') {
                const { handleStandardEventLog } = require('../aarHandlers/handleStandardEventLog');
                await handleStandardEventLog(interaction, eventType);
            } else if (subcommand === 'training') {
                const { handleTrainingSimulationLog } = require('../aarHandlers/handleTrainingSimulationLog');
                await handleTrainingSimulationLog(interaction, eventType);
            } else if (subcommand === 'joint') {
                // Get the selected battalions
                const battalion1 = interaction.options.getString('battalion1');
                const battalion2 = interaction.options.getString('battalion2');
                const battalion3 = interaction.options.getString('battalion3');
                // Collect all selected battalions into an array, filtering out undefined values
                const battalions = [battalion1, battalion2, battalion3].filter(Boolean);
                const { handleJointTrainingLog } = require('../aarHandlers/handleJointTrainingLog');
                await handleJointTrainingLog(interaction, eventType, battalions);
            } else if (subcommand === 'tryout') {
                const { handleTryoutLog } = require('../aarHandlers/handleTryoutLog');
                await handleTryoutLog(interaction, eventType);
            } else if (subcommand === 'basictraining') {
                const {handleBasicTrainingLog} = require('../aarHandlers/handleBasicTrainingLog');
                await handleBasicTrainingLog(interaction, eventType);
            } else if (subcommand === 'rankexam') {
                const {handleRankExamLog} = require('../aarHandlers/handleRankExamLog');
                await handleRankExamLog(interaction, eventType);
            } else if (subcommand === 'gccert') {
                const {handleGCCertLog} = require('../aarHandlers/handleGCCertLog');
                await handleGCCertLog(interaction, eventType);
            } else if (subcommand === '2abcert') {
                const {handle2ABCertLog} = require('../aarHandlers/handle2ABCertLog');
                await handle2ABCertLog(interaction, eventType);
            } else if (subcommand === 'arfcert') {
                const {handleARFCertLog} = require('../aarHandlers/handleARFCertLog');
                await handleARFCertLog(interaction, eventType);
            } else if (subcommand === 'wraithcert') {
                const {handleWraithCertLog} = require('../aarHandlers/handleWraithCertLog');
                await handleWraithCertLog(interaction, eventType);
            } else if (subcommand === 'mediccert') {
                const {handleMedicCertLog} = require('../aarHandlers/handleMedicCertLog');
                await handleMedicCertLog(interaction, eventType);
            } else if (subcommand === 'heavycert') {
                const {handleHeavyCertLog} = require('../aarHandlers/handleHeavyCertLog');
                await handleHeavyCertLog(interaction, eventType);
            } else if (subcommand === 'jsfgoldcert') {
                const {handleJSFGoldCertLog} = require('../aarHandlers/handleJSFGoldCertLog');
                await handleJSFGoldCertLog(interaction, eventType);
            } else if (subcommand === 'ncosncobt') {
                const {handleNCOSNCOBTLog} = require('../aarHandlers/handleNCOSNCOBTLog');
                await handleNCOSNCOBTLog(interaction, eventType);
            } else if (subcommand === 'btcert') {
                const {handleBTCertLog} = require('../aarHandlers/handleBTCertLog');
                await handleBTCertLog(interaction, eventType);
            } else if (subcommand === 'gmactivities') {
                const {handleGMActivitiesLog} = require('../aarHandlers/handleGMActivitiesLog');
                await handleGMActivitiesLog(interaction, eventType);
            } else {
                console.log(subcommand);
                await interaction.editReply({content: `AAR logging for ${eventType} is not yet implemented.`, ephemeral: true});
            }
            console.log(`subcommand: ${subcommand}`);
        }
        if (subcommand === 'participants') {
            const {handleAppendLog} = require('../aarHandlers/handleAppendLog');
            await handleAppendLog(interaction);
        }
    }
}