const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const cacheManager = require('../cacheManager');
require('dotenv').config();

// Configure Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
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
            const eligibleMembers = await getEligibleMembers();
            
            // Step 2: Check for voting messages in the specified channel
            const votingMessages = await checkVotingMessages(interaction.client);
            
            // Step 3: Create and send the embed
            const embed = createEmbed(eligibleMembers, votingMessages);
            
            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error executing eligiblevotes command:', error);
            await interaction.editReply({
                content: `An error occurred while checking eligible votes: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

// Helper function to check if a user is an officer
async function isUserOfficer(discordId) {
    try {
        // Use the cache manager to get officer data
        const rows = await cacheManager.getCachedSheetData(
            process.env.OFFICER_SPREADSHEET_ID,
            `'Bot'!A2:C1000`,
            'officer'
        );
        
        const userRow = rows.find(row => row[0] === discordId);
        
        // Check if column C has a true value (officer status)
        // Google Sheets API returns "TRUE" as a string, not a boolean
        return userRow && (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
    } catch (error) {
        console.error('Error checking officer status:', error);
        return false;
    }
}

async function getEligibleMembers() {
    try {
        // First spreadsheet - "Eligible Votes" - use cache
        const eligibleVotesRows = await cacheManager.getCachedSheetData(
            process.env.OFFICER_SPREADSHEET_ID,
            'Eligible Votes!A:B',
            'eligibleVotes'
        );
        
        // Filter rows where column B contains PFC or LCPL
        const eligibleNames = eligibleVotesRows
            .filter(row => row.length > 1 && (row[1].includes('PFC') || row[1].includes('LCPL')))
            .map(row => row[0]);
        
        // Second spreadsheet - "212th Attack Battalion" - use cache
        const battalionRows = await cacheManager.getCachedSheetData(
            process.env.MAIN_SPREADSHEET_ID,
            '212th Attack Battalion!E:M',
            'battalion'
        );
        
        // Filter rows where name is in eligibleNames and column M (index 8) is 0
        const finalEligibleMembers = [];
        
        for (const name of eligibleNames) {
            const matchingRows = battalionRows.filter(row =>
                row.length > 8 &&
                row[0] === name && // Column E is index 0 in this range
                row[8] === '0'     // Column M is index 8 in this range
            );
            
            if (matchingRows.length > 0) {
                finalEligibleMembers.push(name);
            }
        }
        
        return finalEligibleMembers;
    } catch (error) {
        console.error('Error fetching spreadsheet data:', error);
        throw error;
    }
}

async function checkVotingMessages(client) {
    try {
        const channelId = process.env.VOTING_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found`);
        }
        
        // Get messages from the channel
        const messages = await channel.messages.fetch({ limit: 100 });
        console.log(`Fetched ${messages.size} messages from the channel`);
        
        const now = moment();
        const votingMessages = [];
        
        // Process each message
        for (const [messageId, message] of messages) {
            const messageTime = moment(message.createdAt);
            const hoursDifference = now.diff(messageTime, 'hours');
            
            // Check if message contains required mentions and the word "for"
            const hasOfficerHighCommand = message.content.includes(`<@&${process.env.OFFICER_ROLE}>`); // CHANGE
            const has212thMention = message.content.includes(`<@&${process.env['212TH_ROLE']}>`); // CHANGE
            const hasForWord = message.content.toLowerCase().includes('for');
            
            if ((hasOfficerHighCommand || has212thMention) && hasForWord) {
                // Count yes/no reactions if they exist
                const reactions = message.reactions.cache;
                let yesCount = 0;
                let noCount = 0;
                let hasOtherReactions = false;
                
                // Process reactions if they exist
                if (reactions.size > 0) {
                    for (const [emojiId, reaction] of reactions) {
                        const emojiName = reaction.emoji.name.toLowerCase();
                        
                        if (emojiName.includes('yes') || emojiName === '✅') {
                            yesCount = reaction.count;
                            if (yesCount < 0) yesCount = 0;
                        } else if (emojiName.includes('no') || emojiName === '❌') {
                            noCount = reaction.count;
                            if (noCount < 0) noCount = 0;
                        } else {
                            hasOtherReactions = true;
                            break; // Exit the loop as soon as we find a non-yes/no reaction
                        }
                    }
                }
                
                // Only include messages with no reactions or exclusively yes/no reactions
                if (!hasOtherReactions) {
                    votingMessages.push({
                        author: message.author, // Return the full author object instead of just the tag
                        content: message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content,
                        url: message.url,
                        createdAt: message.createdAt.toISOString(),
                        yesCount: yesCount,
                        noCount: noCount,
                        hasReactions: reactions.size > 0
                    });
                }
            }
        }
        
        console.log(`Found ${votingMessages.length} qualifying voting messages`);
        return votingMessages;
    } catch (error) {
        console.error('Error checking voting messages:', error);
        throw error;
    }
}

function createEmbed(eligibleMembers, votingMessages) {
    // Set color based on whether there are any eligible votes OR promotion messages
    const hasContent = eligibleMembers.length > 0 || votingMessages.length > 0;
    const embedColor = hasContent ? '#80ff80' : '#ff8080'; // Light green if either exists, light red if neither
    
    const embed = new EmbedBuilder()
        .setTitle('Promotions')
        .setColor(embedColor)
        .setTimestamp()
        .setThumbnail("https://i.imgur.com/ushtI24.png");
    
    // Add eligible members section
    if (eligibleMembers.length > 0) {
        embed.addFields({
            name: '📋 Enlisted Promos',
            value: eligibleMembers.join('\n'),
            inline: false
        });
    } else {
        embed.addFields({
            name: '📋 Enlisted Promos',
            value: 'No enlisted promos',
            inline: false
        });
    }
    
    // Add voting messages section
    if (votingMessages.length > 0) {
        const messagesText = votingMessages.map(msg => {
            let text = `**Author:** <@${msg.author.id}>\n**Posted:** ${moment(msg.createdAt).format('MMM DD, YYYY')}\n**Content:** ${msg.content}`;
            
            // Add vote counts if there are any reactions
            if (msg.hasReactions) {
                text += `\n**Votes:** ✅ ${msg.yesCount} | ❌ ${msg.noCount}`;
            } else {
                text += '\n**Votes:** None yet';
            }
            
            text += `\n[Jump to Message](${msg.url})`;
            return text;
        }).join('\n\n');
        
        // Check if the message is too long for a single field (Discord limit is 1024 characters)
        if (messagesText.length <= 1024) {
            embed.addFields({
                name: '🗳️ Active Voting Messages',
                value: messagesText,
                inline: false
            });
        } else {
            // Split into multiple fields if needed
            const chunks = splitText(messagesText, 1024);
            chunks.forEach((chunk, index) => {
                embed.addFields({
                    name: index === 0 ? '🗳️ Active Voting Messages' : '🗳️ Continued...',
                    value: chunk,
                    inline: false
                });
            });
        }
    } else {
        embed.addFields({
            name: '🗳️ Active Voting Messages',
            value: 'No active voting messages found. This could be because:\n- No messages with the required mentions and the word "for" exist\n- All matching messages have reactions other than yes/no',
            inline: false
        });
    }
    
    return embed;
}

// Helper function to split text into chunks that fit within Discord's field value limit
function splitText(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    // Split by double newlines which separate message entries
    const entries = text.split('\n\n');
    
    for (const entry of entries) {
        // If adding this entry would exceed the max length, push current chunk and start a new one
        if (currentChunk.length + entry.length + 2 > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = entry;
        } else {
            // Add to current chunk with a separator if not the first entry in this chunk
            if (currentChunk.length > 0) {
                currentChunk += '\n\n';
            }
            currentChunk += entry;
        }
    }
    
    // Push the last chunk if it has content
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}
