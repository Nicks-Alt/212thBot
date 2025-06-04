const moment = require('moment');

async function checkNCOTestingMessages(client) {
    try {
        const channelId = process.env.NCO_VOTING_CHANNEL_ID;
        
        if (!channelId) {
            console.log('NCO_VOTING_CHANNEL_ID not set, skipping NCO testing messages');
            return [];
        }
        
        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            throw new Error(`NCO voting channel with ID ${channelId} not found`);
        }
        
        // Get messages from the channel
        const messages = await channel.messages.fetch({ limit: 100 });
        console.log(`Fetched ${messages.size} messages from the NCO voting channel`);
        
        const now = moment();
        const ncoTestingMessages = [];
        
        // Process each message
        for (const [messageId, message] of messages) {
            const messageTime = moment(message.createdAt);
            const hoursDifference = now.diff(messageTime, 'hours');
            
            // Only include messages that are at least 48 hours old
            if (hoursDifference >= 48) {
                const messageContent = message.content.toLowerCase();
                
                // Check if message contains "end" or "vote" and the 212th role mention
                const hasEndOrVote = messageContent.includes('end') || messageContent.includes('vote');
                const has212thMention = message.content.includes(`<@&${process.env['212TH_ROLE']}>`);
                
                if (hasEndOrVote && has212thMention) {
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
                        ncoTestingMessages.push({
                            author: message.author,
                            content: message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content,
                            url: message.url,
                            createdAt: message.createdAt.toISOString(),
                            yesCount: yesCount,
                            noCount: noCount,
                            hasReactions: reactions.size > 0,
                            hoursSinceCreation: hoursDifference
                        });
                    }
                }
            }
        }
        
        console.log(`Found ${ncoTestingMessages.length} qualifying NCO testing messages (48+ hours old)`);
        return ncoTestingMessages;
    } catch (error) {
        console.error('Error checking NCO testing messages:', error);
        throw error;
    }
}

module.exports = {checkNCOTestingMessages};