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
      
      // Get the SteamID from the Bot database
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
      
      // Get the user's information from the main database
      const userInfo = await getUserInfoFromSteamID(steamId);
      
      if (!userInfo || userInfo.name === 'Unknown') {
        await interaction.editReply({
          content: `Could not find information for ${isLookingUpOtherUser ? userToLookup.username : 'you'} in the 212th database.`,
          ephemeral: true
        });
        return;
      }
      
      // Get the user's statistics from the OFFICER database
      const userStats = await getUserStatsFromSteamID(steamId);
      
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
        
        if (userStats.joints && userStats.joints !== '0') {
          detailedStats.push(`Joints: ${userStats.joints}`);
        }
        
        if (userStats.tryoutsRan && userStats.tryoutsRan !== '0') {
          detailedStats.push(`Tryouts Ran: ${userStats.tryoutsRan}`);
        }
        
        if (userStats.tryoutsOverseen && userStats.tryoutsOverseen !== '0') {
          detailedStats.push(`Tryouts Overseen: ${userStats.tryoutsOverseen}`);
        }
        
        if (userStats.btsRan && userStats.btsRan !== '0') {
          detailedStats.push(`BTs Ran: ${userStats.btsRan}`);
        }
        
        if (userStats.trainingsLead && userStats.trainingsLead !== '0') {
          detailedStats.push(`Trainings Lead: ${userStats.trainingsLead}`);
        }
        
        if (userStats.rankExams && userStats.rankExams !== '0') {
          detailedStats.push(`Rank Exams: ${userStats.rankExams}`);
        }
        
        if (userStats.gcCerts && userStats.gcCerts !== '0') {
          detailedStats.push(`GC Certifications: ${userStats.gcCerts}`);
        }
        
        if (userStats.abCerts && userStats.abCerts !== '0') {
          detailedStats.push(`2AB Certifications: ${userStats.abCerts}`);
        }
        
        if (userStats.arfCerts && userStats.arfCerts !== '0') {
          detailedStats.push(`ARF Certifications: ${userStats.arfCerts}`);
        }
        
        if (userStats.wraithCerts && userStats.wraithCerts !== '0') {
          detailedStats.push(`Wraith Certifications: ${userStats.wraithCerts}`);
        }
        
        if (userStats.medicCerts && userStats.medicCerts !== '0') {
          detailedStats.push(`Medic Certifications: ${userStats.medicCerts}`);
        }
        
        if (userStats.heavyCerts && userStats.heavyCerts !== '0') {
          detailedStats.push(`Heavy Certifications: ${userStats.heavyCerts}`);
        }
        
        if (userStats.jsfGoldCerts && userStats.jsfGoldCerts !== '0') {
          detailedStats.push(`JSF Gold Certifications: ${userStats.jsfGoldCerts}`);
        }
        
        if (userStats.gmActivities && userStats.gmActivities !== '0') {
          detailedStats.push(`GM Activities: ${userStats.gmActivities}`);
        }
        
        if (userStats.ncoTrainings && userStats.ncoTrainings !== '0') {
          detailedStats.push(`(S)NCO Basic Trainings: ${userStats.ncoTrainings}`);
        }
        
        if (userStats.btCerts && userStats.btCerts !== '0') {
          detailedStats.push(`BT Certifications: ${userStats.btCerts}`);
        }
        
        // Add the detailed stats field if there are any non-zero values
        if (detailedStats.length > 0) {
          embed.addFields({ name: 'Detailed Statistics', value: detailedStats.join('\n'), inline: false });
        }
      }
      
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing stats command:', error);
      await interaction.editReply({
        content: 'An error occurred while retrieving your stats. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// Function to get SteamID from Discord ID
async function getSteamIdFromDiscordId(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:B1000`,
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === discordId);
    
    return userRow ? userRow[1] : null;
  } catch (error) {
    console.error('Error getting SteamID from Discord ID:', error);
    return null;
  }
}

// Function to check if a user is an officer
async function isUserOfficer(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`,
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === discordId);
    
    // Check if column C has a true value (officer status)
    return userRow && (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

// Function to get user info from SteamID
async function getUserInfoFromSteamID(steamID) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
      range: `'212th Attack Battalion'!A2:F1000`, // Reduced range to only include needed columns
    });

    const rows = response.data.values || [];
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

// Function to get user statistics from SteamID
async function getUserStatsFromSteamID(steamID) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Statistics'!C2:AA1000`, // Range includes all statistics columns
    });

    const rows = response.data.values || [];
    const result = rows.find(row => row[0] === steamID); // SteamID is column C (index 0 in this range)
    
    if (result) {
      return {
        totalActivities: result[2] || '0',       // Column E (index 2 in this range)
        totalParticipations: result[4] || '0',   // Column G (index 4 in this range)
        s1Events: result[6] || '0',              // Column I (index 6 in this range)
        s2Events: result[7] || '0',              // Column J (index 7 in this range)
        trainings: result[8] || '0',             // Column K (index 8 in this range)
        joints: result[9] || '0',                // Column L (index 9 in this range)
        tryoutsRan: result[10] || '0',           // Column M (index 10 in this range)
        tryoutsOverseen: result[11] || '0',      // Column N (index 11 in this range)
        btsRan: result[12] || '0',               // Column O (index 12 in this range)
        trainingsLead: result[13] || '0',        // Column P (index 13 in this range)
        rankExams: result[14] || '0',            // Column Q (index 14 in this range)
        gcCerts: result[15] || '0',              // Column R (index 15 in this range)
        abCerts: result[16] || '0',              // Column S (index 16 in this range)
        arfCerts: result[17] || '0',             // Column T (index 17 in this range)
        wraithCerts: result[18] || '0',          // Column U (index 18 in this range)
        medicCerts: result[19] || '0',           // Column V (index 19 in this range)
        heavyCerts: result[20] || '0',           // Column W (index 20 in this range)
        jsfGoldCerts: result[21] || '0',         // Column X (index 21 in this range)
        gmActivities: result[22] || '0',         // Column Y (index 22 in this range)
        ncoTrainings: result[23] || '0',         // Column Z (index 23 in this range)
        btCerts: result[24] || '0'               // Column AA (index 24 in this range)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching statistics from spreadsheet:', error);
    return null;
  }
}