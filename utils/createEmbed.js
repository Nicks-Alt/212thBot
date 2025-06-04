const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

function createEmbed(eligibleMembers, votingMessages, ncoTestingMessages = []) {
    // Set color based on whether there are any eligible votes OR promotion messages OR NCO testing messages
    const hasContent = eligibleMembers.length > 0 || votingMessages.length > 0 || ncoTestingMessages.length > 0;
    const embedColor = hasContent ? '#80ff80' : '#ff8080'; // Light green if any exist, light red if none
    
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
    
    // Add NCO testing messages section (moved before Officer votes)
    if (ncoTestingMessages.length > 0) {
        const ncoMessagesText = ncoTestingMessages.map(msg => {
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
        if (ncoMessagesText.length <= 1024) {
            embed.addFields({
                name: '🎖️ NCO Testing Messages',
                value: ncoMessagesText,
                inline: false
            });
        } else {
            // Split into multiple fields if needed
            const {splitText} = require('../utils/splitText');
            const chunks = splitText(ncoMessagesText, 1024);
            chunks.forEach((chunk, index) => {
                embed.addFields({
                    name: index === 0 ? '🎖️ NCO Testing Messages' : '🎖️ Continued...',
                    value: chunk,
                    inline: false
                });
            });
        }
    } else {
        embed.addFields({
            name: '🎖️ NCO Testing Messages',
            value: 'No NCO testing messages found.',
            inline: false
        });
    }
    
    // Add Officer voting messages section (renamed from "Active Voting Messages")
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
                name: '🗳️ Officer Votes',
                value: messagesText,
                inline: false
            });
        } else {
            // Split into multiple fields if needed
            const {splitText} = require('../utils/splitText');
            const chunks = splitText(messagesText, 1024);
            chunks.forEach((chunk, index) => {
                embed.addFields({
                    name: index === 0 ? '🗳️ Officer Votes' : '🗳️ Continued...',
                    value: chunk,
                    inline: false
                });
            });
        }
    } else {
        embed.addFields({
            name: '🗳️ Officer Votes',
            value: 'No officer voting messages found.',
            inline: false
        });
    }
    
    return embed;
}

module.exports = {createEmbed};