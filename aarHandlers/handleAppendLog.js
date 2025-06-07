const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

async function handleAppendLog(interaction) {
    // Check if user is an officer first
    const { isUserOfficer } = require('../utils/isUserOfficer');
    const isOfficer = await isUserOfficer(interaction.user.id);
    
    if (!isOfficer) {
        return await interaction.reply({
            content: '❌ This command is restricted to officers only.',
            ephemeral: true
        });
    }

    const logId = interaction.options.getString('logid');

    try {
        console.log(`Looking for Log ID: ${logId}`);
        
        // Find the AAR message embed first to get existing participants
        const existingParticipants = await getExistingParticipants(logId, interaction.client);
        
        if (!existingParticipants) {
            return await interaction.reply({
                content: `❌ Log ID \`${logId}\` not found in AAR channel. Make sure the Log ID is correct.`,
                ephemeral: true
            });
        }

        const { participants, aarType } = existingParticipants;
        
        // Check if AAR type is editable
        const allowedTypes = ['Server 1 Event', 'Server 2 Event', 'Training Simulation', 'Joint Training Simulation'];
        if (!allowedTypes.includes(aarType)) {
            return await interaction.reply({
                content: `❌ Cannot add participants to AAR type: \`${aarType}\``,
                ephemeral: true
            });
        }
        
        // Create modal with existing participants pre-populated
        const modal = new ModalBuilder()
            .setCustomId(`addtolog_modal_${logId}`)
            .setTitle(`Add/Remove Participants to log`);

        const participantsInput = new TextInputBuilder()
            .setCustomId('participants')
            .setLabel('Participants (comma separated)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Add new participant names separated by commas...')
            .setValue(participants) // Pre-populate with existing participants
            .setRequired(true)
            .setMaxLength(4000);

        const row = new ActionRowBuilder().addComponents(participantsInput);
        modal.addComponents(row);

        // Show the modal to the user
        await interaction.showModal(modal);
        
        // Set up a collector for the modal submit interaction
        const filter = i => i.customId === `addtolog_modal_${logId}`;
        
        try {
            // Wait for the modal to be submitted
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 300000 // 5 minutes
            });
            
            // Get the updated participants from the modal
            const updatedParticipants = modalSubmission.fields.getTextInputValue('participants');
            
            // Defer the reply to give time for processing
            await modalSubmission.deferReply({ ephemeral: true });
            
            if (!updatedParticipants.trim()) {
                return await modalSubmission.editReply({
                    content: '❌ No participants provided.',
                });
            }

            console.log(`Updating participants for Log ID ${logId}`);

            // Update both the AAR message embed and the spreadsheet
            await Promise.all([
                updateAARMessageEmbed(logId, updatedParticipants, interaction.client),
                updateSpreadsheetRow(logId, updatedParticipants, aarType)
            ]);

            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Participants Updated Successfully')
                .setDescription(`**Log ID:** \`${logId}\`\n**Updated Participants:**\n${updatedParticipants.split(',').map(p => `• ${p.trim()}`).join('\n')}`)
                .setColor(0x00FF00)
                .setTimestamp();

            await modalSubmission.editReply({
                embeds: [confirmEmbed],
            });

        } catch (error) {
            console.error('Error with modal submission:', error);
            // If the error is due to timeout, we don't need to do anything
            // as the modal will just close
        }

    } catch (error) {
        console.error('Error finding log:', error);
        await interaction.reply({
            content: '❌ An error occurred while searching for the log.',
            ephemeral: true
        });
    }
}

/**
 * Gets existing participants from the AAR message embed
 * @param {string} logId - The log ID to search for
 * @param {Client} client - Discord client
 * @returns {Promise<Object|null>} - Returns {participants, aarType} or null if not found
 */
async function getExistingParticipants(logId, client) {
    try {
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = client.channels.cache.get(aarChannelId);
        
        if (!aarChannel) {
            console.error(`AAR channel with ID ${aarChannelId} not found`);
            return null;
        }

        // Search for the message with the matching log ID
        let targetMessage = null;
        let lastMessageId = null;
        
        // Fetch messages in batches to find the one with matching log ID
        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }
            
            const messages = await aarChannel.messages.fetch(options);
            
            if (messages.size === 0) {
                break; // No more messages to fetch
            }
            
            // Search through the fetched messages
            for (const [messageId, message] of messages) {
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    if (embed.footer && embed.footer.text && embed.footer.text.includes(`Log ID: ${logId}`)) {
                        targetMessage = message;
                        break;
                    }
                }
            }
            
            if (targetMessage) {
                break; // Found the message
            }
            
            lastMessageId = messages.last().id;
        }
        
        if (!targetMessage) {
            console.error(`Message with Log ID ${logId} not found in AAR channel`);
            return null;
        }

        // Get the existing embed
        const existingEmbed = targetMessage.embeds[0];
        if (!existingEmbed) {
            console.error(`No embed found in message with Log ID ${logId}`);
            return null;
        }

        // Find the participants field
        const participantsField = existingEmbed.fields.find(field => field.name === 'Participants');
        
        if (!participantsField) {
            console.error(`Participants field not found in embed with Log ID ${logId}`);
            return null;
        }

        return {
            participants: participantsField.value,
            aarType: existingEmbed.description // The description contains the AAR type
        };

    } catch (error) {
        console.error('Error getting existing participants:', error);
        return null;
    }
}

/**
 * Updates the AAR message embed with new participants
 * @param {string} logId - The log ID to search for
 * @param {string} updatedParticipants - Updated participants string
 * @param {Client} client - Discord client
 */
async function updateAARMessageEmbed(logId, updatedParticipants, client) {
    try {
        const aarChannelId = process.env.AAR_CHANNEL_ID;
        const aarChannel = client.channels.cache.get(aarChannelId);
        
        if (!aarChannel) {
            console.error(`AAR channel with ID ${aarChannelId} not found`);
            return;
        }

        // Search for the message with the matching log ID
        let targetMessage = null;
        let lastMessageId = null;
        
        // Fetch messages in batches to find the one with matching log ID
        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }
            
            const messages = await aarChannel.messages.fetch(options);
            
            if (messages.size === 0) {
                break; // No more messages to fetch
            }
            
            // Search through the fetched messages
            for (const [messageId, message] of messages) {
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    if (embed.footer && embed.footer.text && embed.footer.text.includes(`Log ID: ${logId}`)) {
                        targetMessage = message;
                        break;
                    }
                }
            }
            
            if (targetMessage) {
                break; // Found the message
            }
            
            lastMessageId = messages.last().id;
        }
        
        if (!targetMessage) {
            console.error(`Message with Log ID ${logId} not found in AAR channel`);
            return;
        }

        // Get the existing embed
        const existingEmbed = targetMessage.embeds[0];
        if (!existingEmbed) {
            console.error(`No embed found in message with Log ID ${logId}`);
            return;
        }

        // Find the participants field and update it
        const fields = [...existingEmbed.fields];
        const participantsFieldIndex = fields.findIndex(field => field.name === 'Participants');
        
        if (participantsFieldIndex === -1) {
            console.error(`Participants field not found in embed with Log ID ${logId}`);
            return;
        }

        // Update the participants field
        fields[participantsFieldIndex].value = updatedParticipants;

        // Create updated embed
        const updatedEmbed = new EmbedBuilder()
            .setTitle(existingEmbed.title)
            .setDescription(existingEmbed.description)
            .setColor(existingEmbed.color)
            .setThumbnail(existingEmbed.thumbnail?.url)
            .addFields(fields)
            .setTimestamp()
            .setFooter(existingEmbed.footer);

        // Update the message
        await targetMessage.edit({ embeds: [updatedEmbed] });
        console.log(`Successfully updated AAR message with Log ID ${logId}`);

    } catch (error) {
        console.error('Error updating AAR message embed:', error);
    }
}

/**
 * Updates the spreadsheet row with new participants based on event type
 * @param {string} logId - The log ID to search for
 * @param {string} updatedParticipants - Updated participants string
 * @param {string} eventType - The type of AAR event
 */
async function updateSpreadsheetRow(logId, updatedParticipants, eventType) {
    try {
        // Initialize Google Sheets API
        const auth = new google.auth.GoogleAuth({
            keyFile: './service_account.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = "1wjm5siit8NNdZJ-zaDsXlXpijywmtWmshc9eMuTCxT0";

        // Find the AAR row
        const { findAAR } = require('../utils/findAAR');
        const result = await findAAR(logId);
        
        if (!result) {
            console.error(`AAR with Log ID ${logId} not found in spreadsheet`);
            return;
        }

        const { rowIndex } = result;

        // Determine the correct column based on event type (matching insertAAR.js logic)
        let participantsColumnIndex;
        
        switch (eventType) {
            case 'Server 1 Event':
            case 'Server 2 Event':
                participantsColumnIndex = 29; // Column AD (data.participants)
                break;
                
            case 'Training Simulation':
                participantsColumnIndex = 23; // Column X (data.participants)
                break;
                
            case 'Joint Training Simulation':
                participantsColumnIndex = 96; // Column CS (data.participants)
                break;
                
            default:
                console.error(`Unsupported event type for participant updates: ${eventType}`);
                return;
        }

        // Convert column index to letter
        function numberToColumnLetter(num) {
            let result = '';
            while (num > 0) {
                num--;
                result = String.fromCharCode(65 + (num % 26)) + result;
                num = Math.floor(num / 26);
            }
            return result;
        }

        const columnLetter = numberToColumnLetter(participantsColumnIndex + 1); // +1 because array is 0-indexed
        const range = `AARs!${columnLetter}${rowIndex}`;

        console.log(`Updating ${eventType} participants in column ${columnLetter} (index ${participantsColumnIndex}) at row ${rowIndex}`);

        // Update the participants cell
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: [[updatedParticipants]]
            }
        });

        console.log(`Successfully updated spreadsheet row ${rowIndex} with new participants`);

    } catch (error) {
        console.error('Error updating spreadsheet:', error);
    }
}

module.exports = { handleAppendLog };