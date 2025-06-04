const moment = require('moment');
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
            
            // Only include messages that are at least 48 hours old
            if (hoursDifference >= 48) {
                // Check if message contains required mentions and the word "for"
                const hasOfficerHighCommand = message.content.includes(`<@&${process.env.OFFICER_ROLE}>`); 
                const has212thMention = message.content.includes(`<@&${process.env['212TH_ROLE']}>`); 
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
                            hasReactions: reactions.size > 0,
                            hoursSinceCreation: hoursDifference
                        });
                    }
                }
            }
        }
        
        console.log(`Found ${votingMessages.length} qualifying voting messages (48+ hours old)`);
        return votingMessages;
    } catch (error) {
        console.error('Error checking voting messages:', error);
        throw error;
    }
}

module.exports = {checkVotingMessages}