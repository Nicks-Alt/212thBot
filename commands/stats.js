const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your 212th Attack Battalion statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check stats for (officers only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if the command is being used to look up another user
      const targetUser = interaction.options.getUser('user');
      const isLookingUpOtherUser = targetUser !== null;
      
      // If looking up another user, check if the requester is an officer
      if (isLookingUpOtherUser) {
        const isOfficer = await isUserOfficer(interaction.user.id);
        
        if (!isOfficer) {
          await interaction.editReply({
            content: 'You must be an officer to check stats for other users.',
            ephemeral: true
          });
          return;
        }
      }
      
      // Determine which user to look up
      const userToLookup = isLookingUpOtherUser ? targetUser : interaction.user;
      
      // Get the Discord ID of the user to look up
      const discordId = userToLookup.id;
      
      // Get the SteamID from the Bot database using cache
      console.log(`Getting SteamID for Discord ID: ${discordId}`);
      const steamId = await getSteamIdFromDiscordId(discordId);
      
      if (!steamId) {
        await interaction.editReply({
          content: isLookingUpOtherUser 
            ? `${userToLookup.username} is not registered in our system.` 
            : 'You are not registered in our system. Please use `/register` with your SteamID to register first.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Found SteamID: ${steamId} for Discord ID: ${discordId}`);
      
      // Get the user's information and statistics in one call
      const { userInfo, userStats } = await getUserInfoAndStatsFromSteamID(steamId);
      
      if (!userInfo || userInfo.name === 'Unknown') {
        await interaction.editReply({
          content: `Could not find information for ${isLookingUpOtherUser ? userToLookup.username : 'you'} in the 212th database.`,
          ephemeral: true
        });
        return;
      }
      
      // Create an embed with the user's information
      const embed = new EmbedBuilder()
        .setTitle(`212th Attack Battalion - Trooper Stats`)
        .setColor('#FF8C00')
        .setThumbnail('https://i.imgur.com/ushtI24.png')
        .addFields(
          { name: 'Name', value: userInfo.name, inline: true },
          { name: 'Rank', value: userInfo.rank, inline: true },
          { name: 'SteamID', value: steamId, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
      
      // Add statistics fields if they are not 0
      if (userStats) {
        // Add total activities and participations if available
        if (userStats.totalActivities && userStats.totalActivities !== '0') {
          embed.addFields({ name: 'Total Activities', value: userStats.totalActivities, inline: true });
        }
        
        if (userStats.totalParticipations && userStats.totalParticipations !== '0') {
          embed.addFields({ name: 'Total Participations', value: userStats.totalParticipations, inline: true });
        }
        
        // Create a detailed statistics field for non-zero values
        const detailedStats = [];
        
        if (userStats.s1Events && userStats.s1Events !== '0') {
          detailedStats.push(`S1 Events: ${userStats.s1Events}`);
        }
        
        if (userStats.s2Events && userStats.s2Events !== '0') {
          detailedStats.push(`S2 Events: ${userStats.s2Events}`);
        }
        
        if (userStats.trainings && userStats.trainings !== '0') {
          detailedStats.push(`Trainings: ${userStats.trainings}`);
        }
        
        if (userStats.jointTrainings && userStats.jointTrainings !== '0') {
          detailedStats.push(`Joint Trainings: ${userStats.jointTrainings}`);
        }
        
        if (userStats.tryoutsRan && userStats.tryoutsRan !== '0') {
          detailedStats.push(`Tryouts Ran: ${userStats.tryoutsRan}`);
        }
        
        if (userStats.tryoutsOverseen && userStats.tryoutsOverseen !== '0') {
          detailedStats.push(`Tryouts Overseen: ${userStats.tryoutsOverseen}`);
        }
        
        if (userStats.btsRan && userStats.btsRan !== '0') {
          detailedStats.push(`Basic Trainings Ran: ${userStats.btsRan}`);
        }
        
        if (userStats.trainingsLead && userStats.trainingsLead !== '0') {
          detailedStats.push(`Trainings Lead: ${userStats.trainingsLead}`);
        }
        
        if (userStats.rankExams && userStats.rankExams !== '0') {
          detailedStats.push(`Rank Exams: ${userStats.rankExams}`);
        }
        
        // Certifications section
        const certStats = [];
        
        if (userStats.gcCerts && userStats.gcCerts !== '0') {
          certStats.push(`GC Certs: ${userStats.gcCerts}`);
        }
        
        if (userStats.abCerts && userStats.abCerts !== '0') {
          certStats.push(`2AB Certs: ${userStats.abCerts}`);
        }
        
        if (userStats.arfCerts && userStats.arfCerts !== '0') {
          certStats.push(`ARF Certs: ${userStats.arfCerts}`);
        }
        
        if (userStats.wraithCerts && userStats.wraithCerts !== '0') {
          certStats.push(`Wraith Certs: ${userStats.wraithCerts}`);
        }
        
        if (userStats.medicCerts && userStats.medicCerts !== '0') {
          certStats.push(`Medic Certs: ${userStats.medicCerts}`);
        }
        
        if (userStats.heavyCerts && userStats.heavyCerts !== '0') {
          certStats.push(`Heavy Certs: ${userStats.heavyCerts}`);
        }
        
        if (userStats.jsfGoldCerts && userStats.jsfGoldCerts !== '0') {
          certStats.push(`JSF Gold Certs: ${userStats.jsfGoldCerts}`);
        }
        
        // Advanced stats section
        const advancedStats = [];
        
        if (userStats.gmActivities && userStats.gmActivities !== '0') {
          advancedStats.push(`GM Activities: ${userStats.gmActivities}`);
        }
        
        if (userStats.sncoBtsRan && userStats.sncoBtsRan !== '0') {
          advancedStats.push(`(S)NCO BTs Ran: ${userStats.sncoBtsRan}`);
        }
        
        if (userStats.btCertsGiven && userStats.btCertsGiven !== '0') {
          advancedStats.push(`BT Certs Given: ${userStats.btCertsGiven}`);
        }
        
        // Add the detailed stats field if there are any non-zero values
        if (detailedStats.length > 0) {
          embed.addFields({ name: 'Activity Statistics', value: detailedStats.join('\n'), inline: false });
        }
        
        // Add the certification stats field if there are any non-zero values
        if (certStats.length > 0) {
          embed.addFields({ name: 'Certification Statistics', value: certStats.join('\n'), inline: false });
        }
        
        // Add the advanced stats field if there are any non-zero values
        if (advancedStats.length > 0) {
          embed.addFields({ name: 'Advanced Statistics', value: advancedStats.join('\n'), inline: false });
        }
      } else {
        embed.addFields({ name: 'Statistics', value: 'No statistics available yet.', inline: false });
      }
      
      // Send the embed
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing stats command:', error);
      await interaction.editReply({
        content: `An error occurred while retrieving statistics: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// Helper function to check if a user is an officer using cache
async function isUserOfficer(discordId) {
  try {
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C`,
      'registrationdata',
      false,
      'UNFORMATTED_VALUE'
    );

    const userRow = rows.find(row => row[0] === discordId);
    
    // If user found and officer status is true (column C, index 2)
    return userRow && userRow.length > 2 && 
           (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

// Helper function to get SteamID from Discord ID using cache
async function getSteamIdFromDiscordId(discordId) {
  try {
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:B`,
      'registrationdata'
    );
    
    const userRow = rows.find(row => row[0] === discordId);
    console.log("User Row:", userRow);
    return userRow ? userRow[1] : null;
  } catch (error) {
    console.error('Error getting SteamID from Discord ID:', error);
    return null;
  }
}

// Helper function to get user info from SteamID using cache
async function getUserInfoFromSteamID(steamID) {
  try {
    const rows = await cacheManager.getCachedSheetData(
      process.env.MAIN_SPREADSHEET_ID,
      `'212th Attack Battalion'!A2:F1000`,
      'mainsheetdata'
    );
    
    const result = rows.find(row => row[5] === steamID); // SteamID is column F (index 5)
    
    if (result) {
      return {
        name: result[4] || 'Unknown', // Name is in column E (index 4)
        rank: result[2] || 'Unknown'  // Rank is in column C (index 2)
      };
    }
    
    return { name: 'Unknown', rank: 'Unknown' };
  } catch (error) {
    console.error('Error fetching info from spreadsheet:', error);
    return { name: 'Unknown', rank: 'Unknown' };
  }
}

// Helper function to get user statistics from SteamID using cache
async function getUserStatsFromSteamID(steamID) {
  try {
    // Get statistics from the Statistics sheet - extending range to include all columns (A to AA)
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Statistics'!A:AA`,
      'statistics'
    );
    
    // SteamID is in column C (index 2)
    const userRow = rows.find(row => row[2] === steamID);
    
    if (!userRow) {
      return null;
    }
    
    // Map the statistics to a more readable format using the correct indices
    return {
      name: userRow[1] || 'Unknown',           // Column B (index 1) - Name
      totalActivities: userRow[4] || '0',      // Column E (index 4) - Total Activities
      totalParticipations: userRow[6] || '0',  // Column G (index 6) - Total Participations
      s1Events: userRow[8] || '0',             // Column I (index 8) - S1 Events
      s2Events: userRow[9] || '0',             // Column J (index 9) - S2 Events
      trainings: userRow[10] || '0',           // Column K (index 10) - Trainings Logged
      jointTrainings: userRow[11] || '0',      // Column L (index 11) - Joint Trainings Logged
      tryoutsRan: userRow[12] || '0',          // Column M (index 12) - Tryouts Ran
      tryoutsOverseen: userRow[13] || '0',     // Column N (index 13) - Tryouts Overseen
      btsRan: userRow[14] || '0',              // Column O (index 14) - BTs Ran
      trainingsLead: userRow[15] || '0',       // Column P (index 15) - Trainings Lead
      rankExams: userRow[16] || '0',           // Column Q (index 16) - Rank Exams Ran
      gcCerts: userRow[17] || '0',             // Column R (index 17) - GC Certs
      abCerts: userRow[18] || '0',             // Column S (index 18) - 2AB Certs
      arfCerts: userRow[19] || '0',            // Column T (index 19) - ARF Certs
      wraithCerts: userRow[20] || '0',         // Column U (index 20) - Wraith
      medicCerts: userRow[21] || '0',          // Column V (index 21) - Medic
      heavyCerts: userRow[22] || '0',          // Column W (index 22) - Heavy
      jsfGoldCerts: userRow[23] || '0',        // Column X (index 23) - JSF Gold
      gmActivities: userRow[24] || '0',        // Column Y (index 24) - GM Activities
      sncoBtsRan: userRow[25] || '0',          // Column Z (index 25) - SNCO BTs Ran
      btCertsGiven: userRow[26] || '0'         // Column AA (index 26) - BT Certs Given
    };
  } catch (error) {
    console.error('Error fetching statistics from spreadsheet:', error);
    return null;
  }
}

// Helper function to get user info and statistics from SteamID using cache
async function getUserInfoAndStatsFromSteamID(steamID) {
  try {
    console.log(`Looking up info and stats for SteamID: ${steamID}`);
    
    // Get statistics from the Statistics sheet - extending range to include all columns (A to AA)
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Statistics'!A2:AA`,
      'statistics'
    );
    
    console.log(`Got ${rows.length} rows from statistics cache`);
    
    // SteamID is in column C (index 2)
    const userRow = rows.find(row => row && row[2] === steamID);
    
    if (!userRow) {
      console.log(`No statistics found for SteamID: ${steamID}`);
      
      // If not found in statistics, try to get basic info from main sheet
      try {
        const mainRows = await cacheManager.getCachedSheetData(
          process.env.MAIN_SPREADSHEET_ID,
          `'212th Attack Battalion'!A2:F1000`,
          'mainsheetdata'
        );
        
        const mainResult = mainRows.find(row => row && row[5] === steamID);
        
        if (mainResult) {
          console.log(`Found basic info in main sheet for SteamID: ${steamID}`);
          return {
            userInfo: {
              name: mainResult[4] || 'Unknown',
              rank: mainResult[2] || 'Unknown'
            },
            userStats: null
          };
        }
      } catch (mainError) {
        console.error('Error fetching info from main spreadsheet:', mainError);
      }
      
      return { userInfo: { name: 'Unknown', rank: 'Unknown' }, userStats: null };
    }
    
    console.log(`Found statistics for SteamID: ${steamID}`);
    
    // Extract user info from the stats sheet
    const userInfo = {
      name: userRow[1] || 'Unknown',  // Column B (index 1) - Name
      rank: userRow[0] || 'Unknown'   // Column A (index 0) - Rank
    };
    
    // Map the statistics to a more readable format using the correct indices
    const userStats = {
      totalActivities: userRow[4] || '0',      // Column E (index 4) - Total Activities
      totalParticipations: userRow[6] || '0',  // Column G (index 6) - Total Participations
      s1Events: userRow[8] || '0',             // Column I (index 8) - S1 Events
      s2Events: userRow[9] || '0',             // Column J (index 9) - S2 Events
      trainings: userRow[10] || '0',           // Column K (index 10) - Trainings Logged
      jointTrainings: userRow[11] || '0',      // Column L (index 11) - Joint Trainings Logged
      tryoutsRan: userRow[12] || '0',          // Column M (index 12) - Tryouts Ran
      tryoutsOverseen: userRow[13] || '0',     // Column N (index 13) - Tryouts Overseen
      btsRan: userRow[14] || '0',              // Column O (index 14) - BTs Ran
      trainingsLead: userRow[15] || '0',       // Column P (index 15) - Trainings Lead
      rankExams: userRow[16] || '0',           // Column Q (index 16) - Rank Exams Ran
      gcCerts: userRow[17] || '0',             // Column R (index 17) - GC Certs
      abCerts: userRow[18] || '0',             // Column S (index 18) - 2AB Certs
      arfCerts: userRow[19] || '0',            // Column T (index 19) - ARF Certs
      wraithCerts: userRow[20] || '0',         // Column U (index 20) - Wraith
      medicCerts: userRow[21] || '0',          // Column V (index 21) - Medic
      heavyCerts: userRow[22] || '0',          // Column W (index 22) - Heavy
      jsfGoldCerts: userRow[23] || '0',        // Column X (index 23) - JSF Gold
      gmActivities: userRow[24] || '0',        // Column Y (index 24) - GM Activities
      sncoBtsRan: userRow[25] || '0',          // Column Z (index 25) - SNCO BTs Ran
      btCertsGiven: userRow[26] || '0'         // Column AA (index 26) - BT Certs Given
    };
    
    return { userInfo, userStats };
  } catch (error) {
    console.error('Error fetching info and statistics from spreadsheet:', error);
    return { userInfo: { name: 'Unknown', rank: 'Unknown' }, userStats: null };
  }
}