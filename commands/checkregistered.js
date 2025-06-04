const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { google } = require('googleapis');

// Set up Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to check if a user is an officer using the cache
async function isUserOfficer(discordId) {
  try {
    // Get the cached data using the new cache key
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A:C`,
      'registrationdata'
    );
    
    const userRow = rows.find(row => row[0] === discordId);
    
    // Check for various possible "true" values
    const isOfficer = userRow && userRow.length > 2 && 
           (userRow[2] === true || 
            userRow[2] === "TRUE" || 
            userRow[2] === "true" || 
            userRow[2] === 1 ||
            String(userRow[2]).toLowerCase() === "true");
    
    return isOfficer;
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false; // Default to not an officer on error
  }
}

// Function to fetch a specific page of registered users
async function fetchRegisteredUsersPage(page, pageSize) {
  try {
    // Calculate the range to fetch
    const startRow = 2 + (page - 1) * pageSize;
    const endRow = startRow + pageSize - 1;
    const range = `'Bot'!A${startRow}:C${endRow}`;
    
    // Fetch the data directly from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: range,
    });
    
    // Filter out empty rows
    const rows = response.data.values || [];
    return rows.filter(row => row && row.length > 0 && row[0] && row[1]);
  } catch (error) {
    console.error('Error fetching registered users page:', error);
    return [];
  }
}

// Function to get the total count of registered users
async function getTotalRegisteredUsers() {
  try {
    // Get all data to count total entries using the new cache key
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:A1000`,
      'registrationdata'
    );
    
    // Filter out empty rows
    return rows.filter(row => row && row.length > 0 && row[0]).length;
  } catch (error) {
    console.error('Error getting total registered users:', error);
    return 0;
  }
}

// Helper function to split text into chunks of max length
function splitTextIntoChunks(text, maxLength = 1000) { // Using 1000 to be safe (below 1024 limit)
  const chunks = [];
  let currentChunk = "";
  
  // Split by newlines first to avoid breaking in the middle of a line
  const lines = text.split('\n');
  
  for (const line of lines) {
    // If adding this line would exceed the limit, start a new chunk
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      // Add to current chunk with a newline if not empty
      if (currentChunk) {
        currentChunk += '\n' + line;
      } else {
        currentChunk = line;
      }
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkregistered')
    .setDescription('Check which users are registered with the bot')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('Check if a specific user is registered (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if the user is an officer
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'This command is only available to officers.',
          ephemeral: true
        });
        return;
      }
      
      // Get the specified user (if any)
      const targetUser = interaction.options.getUser('user');
      
      // If a specific user was provided, check only that user
      if (targetUser) {
        // Fetch registration data from the cache using the new cache key
        const registeredUsers = await cacheManager.getCachedSheetData(
          process.env.OFFICER_SPREADSHEET_ID,
          `'Bot'!A2:C1000`,
          'registrationdata'
        );
        
        // Filter out empty rows
        const validRegisteredUsers = registeredUsers.filter(row => row && row.length > 0 && row[0] && row[1]);
        const userEntry = validRegisteredUsers.find(row => row[0] === targetUser.id);
        
        if (userEntry) {
          const isOfficer = userEntry.length > 2 && 
                          (userEntry[2] === true || 
                           userEntry[2] === "TRUE" || 
                           userEntry[2] === "true" || 
                           userEntry[2] === 1 ||
                           String(userEntry[2]).toLowerCase() === "true");
          
          const embed = new EmbedBuilder()
            .setTitle('Registration Check')
            .setColor('#00FF00')
            .setDescription(`✅ **${targetUser.tag}** is registered with the bot.`)
            .addFields(
              { name: 'Discord ID', value: userEntry[0], inline: true },
              { name: 'Steam ID', value: userEntry[1], inline: true },
              { name: 'Officer Status', value: isOfficer ? 'Yes' : 'No', inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: '212th Attack Battalion', iconURL: 'https://i.imgur.com/ushtI24.png' });
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('Registration Check')
            .setColor('#FF0000')
            .setDescription(`❌ **${targetUser.tag}** is not registered with the bot.`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: '212th Attack Battalion', iconURL: 'https://i.imgur.com/ushtI24.png' });
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
        return;
      }
      
      // For listing all users, implement pagination with lazy loading
      const USERS_PER_PAGE = 15; // Reduced from 25 to avoid hitting embed limits
      let currentPage = 1;
      
      // Get the total count of registered users
      const totalRegisteredUsers = await getTotalRegisteredUsers();
      const totalPages = Math.ceil(totalRegisteredUsers / USERS_PER_PAGE);
      
      // Function to generate embed for a specific page
      async function generateEmbed(page) {
        // Fetch just the current page of data
        const pageUsers = await fetchRegisteredUsersPage(page, USERS_PER_PAGE);
        
        // Process the users on this page
        const displayedUsers = pageUsers.map(entry => ({
          discordId: entry[0],
          steamId: entry[1],
          isOfficer: entry.length > 2 && 
                    (entry[2] === true || 
                     entry[2] === "TRUE" || 
                     entry[2] === "true" || 
                     entry[2] === 1 ||
                     String(entry[2]).toLowerCase() === "true")
        }));
        
        const startIndex = (page - 1) * USERS_PER_PAGE + 1;
        const endIndex = Math.min(startIndex + pageUsers.length - 1, totalRegisteredUsers);
        
        const embed = new EmbedBuilder()
          .setTitle('Registered Users')
          .setColor('#FF8C00')
          .setDescription(`Found ${totalRegisteredUsers} registered users.`)
          .setTimestamp()
          .setFooter({ text: totalPages > 1 ? `Page ${page}/${totalPages} • 212th Attack Battalion` : '212th Attack Battalion', iconURL: 'https://i.imgur.com/ushtI24.png' });
        
        // Add registered users to the embed
        if (displayedUsers.length > 0) {
          // Create the text with all users
          const registeredText = displayedUsers.map(user => 
            `<@${user.discordId}> (${user.steamId})${user.isOfficer ? ' 👑' : ''}`
          ).join('\n');
          
          // Split into chunks if needed to avoid Discord's 1024 character limit
          const chunks = splitTextIntoChunks(registeredText);
          
          // Add each chunk as a separate field
          if (chunks.length === 1) {
            embed.addFields({ 
              name: `Registered Users (${startIndex}-${endIndex} of ${totalRegisteredUsers})`, 
              value: chunks[0],
              inline: false 
            });
          } else {
            for (let i = 0; i < chunks.length; i++) {
              embed.addFields({ 
                name: i === 0 
                  ? `Registered Users (${startIndex}-${endIndex} of ${totalRegisteredUsers})` 
                  : `Registered Users (continued ${i+1})`, 
                value: chunks[i],
                inline: false 
              });
            }
          }
        } else {
          embed.addFields({ name: 'Registered Users', value: 'None found', inline: false });
        }
        
        // Add total count
        embed.addFields({ 
          name: 'Total Registered', 
          value: `${totalRegisteredUsers} users total`,
          inline: false 
        });
        
        return embed;
      }
      
      // Create pagination buttons
      function getButtons(page) {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('first')
              .setLabel('⏮️ First')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 1),
            new ButtonBuilder()
              .setCustomId('previous')
              .setLabel('◀️ Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 1),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next ▶️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === totalPages),
            new ButtonBuilder()
              .setCustomId('last')
              .setLabel('Last ⏭️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === totalPages)
          );
        
        return row;
      }
      
      // Initial response
      const initialEmbed = await generateEmbed(currentPage);
      
      // Only add buttons if there are more than 15 entries (which means more than 1 page with 15 users per page)
      let message;
      if (totalRegisteredUsers > 15) {
        const buttons = getButtons(currentPage);
        message = await interaction.editReply({ 
          embeds: [initialEmbed], 
          components: [buttons],
          ephemeral: true 
        });
        
        // Create button collector
        const collector = message.createMessageComponentCollector({ 
          componentType: ComponentType.Button,
          time: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
          // Verify that the button interaction is from the same user
          if (i.user.id !== interaction.user.id) {
            await i.reply({ 
              content: 'These buttons are not for you!', 
              ephemeral: true 
            });
            return;
          }
          
          // Handle button interactions
          switch (i.customId) {
            case 'first':
              currentPage = 1;
              break;
            case 'previous':
              currentPage = Math.max(1, currentPage - 1);
              break;
            case 'next':
              currentPage = Math.min(totalPages, currentPage + 1);
              break;
            case 'last':
              currentPage = totalPages;
              break;
          }
          
          // Show loading state
          await i.deferUpdate();
          
          // Update the message with the new page
          const newEmbed = await generateEmbed(currentPage);
          const newButtons = getButtons(currentPage);
          
          await i.editReply({ 
            embeds: [newEmbed], 
            components: [newButtons] 
          });
        });
        
        collector.on('end', async () => {
          // Remove buttons when collector expires
          try {
            const finalEmbed = await generateEmbed(currentPage);
            await message.edit({ 
              embeds: [finalEmbed], 
              components: [] 
            });
          } catch (error) {
            console.error('Error removing buttons after collector end:', error);
          }
        });
      } else {
        // If 15 or fewer entries, no need for buttons
        message = await interaction.editReply({ 
          embeds: [initialEmbed], 
          ephemeral: true 
        });
      }
      
    } catch (error) {
      console.error('Error executing checkregistered command:', error);
      await interaction.editReply({
        content: `An error occurred while checking registered users: ${error.message}`,
        ephemeral: true
      });
    }
  }
};