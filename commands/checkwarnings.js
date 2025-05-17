const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const cacheManager = require('../cacheManager');

// Function to check if a user is an officer using the cache
async function isUserOfficer(discordId) {
  try {
    // Get the cached officer data
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C`,
      'registrationdata'
    );

    const userRow = rows.find(row => row[0] === discordId);
    
    // If user found and officer status is true (column C, index 2)
    return userRow && userRow.length > 2 && (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkwarnings')
    .setDescription('Check all punishment records for a SteamID (Officer Only)')
    .addStringOption(option =>
      option.setName('steamid')
        .setDescription('The SteamID to check records for')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Restrict to users with Manage Messages permission

  async execute(interaction) {
    try {
      // Check if the user is an officer
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      // If not an officer, deny access
      if (!isOfficer) {
        await interaction.editReply({
          content: 'You do not have permission to use this command. This command is restricted to officers only.',
          ephemeral: true
        });
        return;
      }
      
      // Get the SteamID from the command option
      const steamId = interaction.options.getString('steamid');
      
      // Normalize the SteamID for comparison
      const normalizedSteamId = steamId.trim().toUpperCase();
      
      // Get the punishment data from cache - use a larger range to ensure we get all data
      const punishmentData = await cacheManager.getCachedSheetData(
        process.env.OFFICER_SPREADSHEET_ID,
        `'Punishment Log'!A2:F5000`, // Increased range to 5000 rows
        'punishments',
        true // Force refresh to get the latest data
      );
      
      console.log(`Checking records for SteamID: ${normalizedSteamId}`);
      console.log(`Found ${punishmentData.length} total punishment records`);
      
      // Filter punishments for the specified SteamID
      const userRecords = punishmentData.filter(row => {
        // Make sure row exists and has at least 3 elements (index 2 would be the SteamID)
        if (!row || row.length < 3 || !row[2]) return false;
        
        // Compare SteamIDs (case-insensitive and trimmed)
        const rowSteamId = row[2].trim().toUpperCase();
        
        return rowSteamId === normalizedSteamId;
      });
      
      console.log(`Found ${userRecords.length} records for SteamID: ${normalizedSteamId}`);
      
      // Debug: Log all records found for this SteamID
      userRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, JSON.stringify(record));
      });
      
      // Get current date and date 30 days ago
      const currentDate = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);
      
      console.log(`Current date: ${currentDate.toISOString()}, 30 days ago: ${thirtyDaysAgo.toISOString()}`);
      
      // Parse dates for all records for better sorting and filtering
      const recordsWithDates = userRecords.map(record => {
        const dateString = record[0];
        let parsedDate = null;
        
        if (dateString) {
          try {
            // Try MM/DD/YYYY format
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              
              if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                parsedDate = new Date(year, month - 1, day);
                console.log(`Parsed date ${dateString} as ${parsedDate.toISOString()}`);
              }
            }
          } catch (error) {
            console.error(`Error parsing date: ${dateString}`, error);
          }
        }
        
        return { ...record, parsedDate };
      });
      
      // Filter recent records (last 30 days)
      const recentRecords = recordsWithDates.filter(record => {
        if (!record.parsedDate) return false;
        const isRecent = record.parsedDate >= thirtyDaysAgo;
        
        if (isRecent) {
          console.log(`Recent record: ${JSON.stringify(record)}`);
        }
        
        return isRecent;
      });
      
      // Filter older records
      const olderRecords = recordsWithDates.filter(record => {
        if (!record.parsedDate) return true; // Include records with no date in older records
        return record.parsedDate < thirtyDaysAgo;
      });
      
      console.log(`Found ${recentRecords.length} recent records and ${olderRecords.length} older records`);
      
      // Sort records by date (newest first)
      const sortedRecentRecords = [...recentRecords].sort((a, b) => {
        if (!a.parsedDate) return 1;
        if (!b.parsedDate) return -1;
        return b.parsedDate - a.parsedDate;
      });
      
      const sortedOlderRecords = [...olderRecords].sort((a, b) => {
        if (!a.parsedDate) return 1;
        if (!b.parsedDate) return -1;
        return b.parsedDate - a.parsedDate;
      });
      
      // Combine all records for pagination
      const allSortedRecords = {
        recent: sortedRecentRecords,
        older: sortedOlderRecords
      };
      
      // Set up pagination
      const recordsPerPage = 5;
      let currentPage = 0;
      const totalRecentPages = Math.ceil(sortedRecentRecords.length / recordsPerPage) || 1;
      const totalOlderPages = Math.ceil(sortedOlderRecords.length / recordsPerPage) || 1;
      let currentSection = sortedRecentRecords.length > 0 ? 'recent' : 'older'; // Start with recent if available
      
      // Function to generate embed for current page
      function generateEmbed() {
        const embed = new EmbedBuilder()
          .setTitle(`Punishment Records for SteamID: ${steamId}`)
          .setColor(0xFFA500) // Orange color
          .setDescription(`Found ${recentRecords.length} records in the last 30 days and ${userRecords.length} records overall.`)
          .setTimestamp();
        
        const currentRecords = allSortedRecords[currentSection];
        const totalPages = currentSection === 'recent' ? totalRecentPages : totalOlderPages;
        
        // Calculate start and end indices for current page
        const startIdx = currentPage * recordsPerPage;
        const endIdx = Math.min(startIdx + recordsPerPage, currentRecords.length);
        
        // Add section header
        if (currentSection === 'recent') {
          embed.addFields({ 
            name: `📅 Recent Records (Last 30 Days) - Page ${currentPage + 1}/${totalPages}`, 
            value: currentRecords.length > 0 ? '\u200B' : 'No records in the last 30 days.' 
          });
        } else {
          embed.addFields({ 
            name: `📜 Previous Records - Page ${currentPage + 1}/${totalPages}`, 
            value: currentRecords.length > 0 ? '\u200B' : 'No previous records found.' 
          });
        }
        
        // Add records for current page
        if (currentRecords.length > 0) {
          for (let i = startIdx; i < endIdx; i++) {
            const record = currentRecords[i];
            const date = record[0] || 'Unknown Date';
            const name = record[1] || 'Unknown Name';
            const reason = record[3] || 'No reason provided';
            const punishment = record[4] ? record[4].toLowerCase() : 'unknown';
            const officer = record[5] || 'Unknown Officer';
            
            // Determine color indicator based on punishment type
            // Yellow for warnings, Orange for demotions, Red for kicks, Blue for blacklists
            let indicator = '⚪'; // Default for other punishments
            
            if (punishment.includes('warning')) {
              indicator = '🟡'; // Yellow for warnings
            } else if (punishment.includes('demot') || punishment.includes('rank')) {
              indicator = '🟠'; // Orange for demotions
            } else if (punishment.includes('kick')) {
              indicator = '🔴'; // Red for kicks
            } else if (punishment.includes('blacklist') || punishment.includes('bl')) {
              indicator = '🔵'; // Blue for blacklists
            }
            
            embed.addFields({
              name: `${indicator} Record #${i + 1} - ${date}`,
              value: `**Name:** ${name}\n**Reason:** ${reason}\n**Punishment:** ${record[4] || 'Unknown'}\n**Officer:** ${officer}`
            });
          }
        }
        
        // Add a footer with information about the command and color legend
        embed.setFooter({ 
          text: `🟡 Warning | 🟠 Demotion | 🔴 Kick | 🔵 Blacklist` 
        });
        
        return embed;
      }
      
      // Function to generate buttons for navigation
      function generateButtons() {
        const row = new ActionRowBuilder();
        const totalPages = currentSection === 'recent' ? totalRecentPages : totalOlderPages;
        const currentRecords = allSortedRecords[currentSection];
        
        // Previous page button
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0 || currentRecords.length === 0)
        );
        
        // Next page button
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1 || currentRecords.length === 0)
        );
        
        // Toggle section button
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('toggle_section')
            .setLabel(currentSection === 'recent' ? 'View Previous Records' : 'View Recent Records')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled((currentSection === 'recent' && sortedOlderRecords.length === 0) || 
                         (currentSection === 'older' && sortedRecentRecords.length === 0))
        );
        
        return row;
      }
      
      // Send initial embed with buttons
      const initialEmbed = generateEmbed();
      const initialButtons = generateButtons();
      
      const message = await interaction.editReply({
        embeds: [initialEmbed],
        components: [initialButtons],
        ephemeral: true
      });
      
      // Create a collector for button interactions
      const collector = message.createMessageComponentCollector({ 
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async i => {
        // Verify that the interaction is from the original user
        if (i.user.id !== interaction.user.id) {
          await i.reply({ 
            content: 'These buttons are not for you!', 
            ephemeral: true 
          });
          return;
        }
        
        // Handle button interactions
        if (i.customId === 'prev_page') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'next_page') {
          const totalPages = currentSection === 'recent' ? totalRecentPages : totalOlderPages;
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        } else if (i.customId === 'toggle_section') {
          currentSection = currentSection === 'recent' ? 'older' : 'recent';
          currentPage = 0; // Reset to first page when switching sections
        }
        
        // Update the message with new embed and buttons
        await i.update({
          embeds: [generateEmbed()],
          components: [generateButtons()]
        });
      });
      
      collector.on('end', async () => {
        // Remove buttons when collector expires
        try {
          await interaction.editReply({
            embeds: [generateEmbed()],
            components: []
          });
        } catch (error) {
          console.error('Error removing buttons after collector ended:', error);
        }
      });
      
    } catch (error) {
      console.error('Error checking records:', error);
      await interaction.editReply({
        content: `There was an error checking records: ${error.message}`,
        ephemeral: true
      });
    }
  }
};