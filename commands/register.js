const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to get trooper info from SteamID using the direct API endpoints
async function getTrooperInfoFromSteamID(steamID) {
  try {
    // Make sure the steamID is properly formatted
    const formattedSteamID = steamID.trim();
    // First check the 212th endpoint
    let player = await checkBattalionEndpoint('212th', formattedSteamID);
    // If not found in 212th, check 212AB
    if (!player) {
      player = await checkBattalionEndpoint('212AB', formattedSteamID);
    }
    // If player not found in either battalion
    if (!player) {
      console.log(`No player found for SteamID: ${formattedSteamID} in either 212th or 212AB`);
      return { name: 'Unknown', rank: 'Unknown', company: '' };
    }
    
    // Extract the relevant information
    return {
      name: player.name || 'Unknown',
      rank: player.rid || 'Unknown',
      company: player.groupid || '212th', // This will be either '212th' or '212AB'
      characterId: player.characterid,
      promoter: player.promoter,
      lastSeen: player.lastseen,
      added: player.added,
      rankUpdated: player.ridupdated,
      lorename: player.lorename || null // Add the lorename field
    };
  } catch (error) {
    console.error('Error fetching info from SuperiorServers API:', error.message);
    return { name: 'Unknown', rank: 'Unknown', company: '' };
  }
}

// Helper function to check a specific battalion endpoint
async function checkBattalionEndpoint(battalion, steamID) {
  try {
    // Define the API URL based on the battalion
    const apiUrl = `https://superiorservers.co/api/ssrp/cwrp/groupinfo/${battalion}`;
    
    console.log(`Fetching data from ${apiUrl}`);
    
    // Make the API request
    const response = await axios.get(apiUrl);
    const data = response.data;
    
    if (!data || !data.success || !data.response || !data.response.players) {
      console.error(`API data for ${battalion} is invalid:`, JSON.stringify(data, null, 2));
      return null;
    }
    
    console.log(`API returned ${data.response.players.length} players for ${battalion}`);
    
    // Normalize the steamID for comparison
    const normalizedSteamID = steamID.trim().toUpperCase();
    
    // Find matching players with normalized comparison
    const matchingPlayers = data.response.players.filter(p => {
      const playerSteamId = p.steamid ? p.steamid.trim().toUpperCase() : '';
      const matches = playerSteamId === normalizedSteamID;
      if (matches) {
        console.log(`Found matching player: ${p.name} with SteamID: ${p.steamid}`);
      }
      return matches;
    });
    
    if (matchingPlayers.length === 0) {
      console.log(`No ${battalion} player found for SteamID: ${steamID}`);
      return null;
    }
    
    console.log(`Found ${matchingPlayers.length} characters for SteamID: ${steamID} in ${battalion}`);
    
    // Determine which tag to filter based on battalion
    const tagToFilter = battalion === '212th' ? 418 : 522;
    
    // Filter out characters with the appropriate tag
    const validPlayers = matchingPlayers.filter(player => {
      if (!player.tags || !Array.isArray(player.tags)) {
        console.log(`Player ${player.name} has no tags, keeping`);
        return true; // Keep players with no tags
      }
      
      // Check if the player has the tag we're filtering
      const hasFilterTag = player.tags.some(tag => tag === tagToFilter);
      
      if (hasFilterTag) {
        console.log(`Skipping character ${player.name} (${player.characterid}) because it has the ${tagToFilter} tag`);
        return false;
      }
      
      console.log(`Player ${player.name} doesn't have filter tag ${tagToFilter}, keeping`);
      return true;
    });
    
    if (validPlayers.length === 0) {
      console.log(`All characters for SteamID: ${steamID} in ${battalion} have the ${tagToFilter} tag`);
      return null;
    }
    
    // Use the first valid player
    const player = validPlayers[0];
    
    // Print player information to console
    console.log(`Found valid player information in ${battalion}:`);
    console.log(JSON.stringify(player, null, 2));
    
    return player;
  } catch (error) {
    console.error(`Error fetching data from ${battalion} API:`, error.message);
    if (error.response) {
      console.error(`API error response:`, error.response.data);
    }
    return null;
  }
}

// Function to check if a user is already registered using the cache
async function isUserRegistered(discordId, steamId) {
  try {
    // Use the cache manager to get the data
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C1000`,
      'registrationdata'
    );
    
    // Normalize the SteamID for comparison
    const normalizedSteamId = steamId.trim().toUpperCase();
    
    return rows.some(row => {
      if (!row[0] && !row[1]) return false; // Skip empty rows
      
      const rowDiscordId = row[0];
      const rowSteamId = row[1] ? row[1].trim().toUpperCase() : '';
      
      return rowDiscordId === discordId || rowSteamId === normalizedSteamId;
    });
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
}

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
    return userRow && userRow.length > 2 && 
           (userRow[2] === true || userRow[2] === "TRUE" || userRow[2] === "true");
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false;
  }
}

// Function to register user in the database
async function registerUserInDatabase(discordId, steamId, isOfficer) {
  try {
    // Get the cached data to find the first empty row
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:C1000`,
      'registrationdata'
    );
    
    // Find the first empty row
    let emptyRowIndex = 2; // Start from row 2 (after headers)
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i][0]) {
        emptyRowIndex = i + 2; // +2 because we start from row 2 and array is 0-indexed
        break;
      }
      emptyRowIndex = i + 3; // Next row after the last filled one
    }

    // Store officer status as a string "TRUE" or "FALSE" for consistency
    const officerValue = isOfficer ? "TRUE" : "FALSE";
    console.log(`Registering user ${discordId} with officer status: ${officerValue} at row ${emptyRowIndex}`);

    // Insert the new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A${emptyRowIndex}:C${emptyRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[discordId, steamId, officerValue]]
      }
    });

    // Add the new entry to the rows array we already have
    rows.push([discordId, steamId, officerValue]);
    console.log(`Added new entry to cache. Cache now contains ${rows.length} entries`);

    return { success: true };
  } catch (error) {
    console.error('Error registering user in database:', error);
    return { success: false, message: 'An error occurred while registering in the database. Please contact an administrator.' };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your SteamID with the 212th Attack Battalion')
    .addStringOption(option =>
      option
        .setName('steamid')
        .setDescription('Your Steam ID (e.g., STEAM_0:1:12345678)')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to register (officers only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Defer the reply immediately to prevent the "InteractionNotReplied" error
    await interaction.deferReply({ephemeral: true});
    
    // Get the SteamID from the command option
    const steamId = interaction.options.getString('steamid');
    console.log(`DEBUG: Registration attempt with SteamID: ${steamId}`);
    
    // Check if registering another user
    const targetUser = interaction.options.getUser('user');
    const isRegisteringOtherUser = targetUser !== null;
    
    // If registering another user, check if the requester is an officer
    if (isRegisteringOtherUser) {
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'You must be an officer to register other users.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Officer ${interaction.user.tag} is registering user ${targetUser.tag}`);
    }
    
    // Get the Discord ID of the user to register
    const discordId = isRegisteringOtherUser ? targetUser.id : interaction.user.id;
    
    // Check if the user is already registered
    const alreadyRegistered = await isUserRegistered(discordId, steamId);
    
    if (alreadyRegistered) {
      console.log(`User ${discordId} is already registered`);
      await interaction.editReply({
        content: isRegisteringOtherUser 
          ? `${targetUser.username} is already registered in our system.`
          : 'You are already registered in our system.',
        ephemeral: true
      });
      return;
    }
    
    // Get trooper info from the API
    console.log(`Looking up SteamID: ${steamId}`);
    const trooperInfo = await getTrooperInfoFromSteamID(steamId);
    // If trooper not found, inform them they aren't registered
    if (!trooperInfo) {
      console.log(`Trooper not found for SteamID: ${steamId}`);
      await interaction.editReply({
        content: 'Sorry, it seems you are not registered in our system. Please contact an officer for assistance.',
        ephemeral: true
      });
      return;
    }
    console.log(`Found trooper: ${trooperInfo.name}, Rank: ${trooperInfo.rank}, Company: ${trooperInfo.company}`);
    
    // Check if the user is an officer
    const officerRanks = ['CDR', 'XO', 'COL', 'LTC', 'MAJ', 'CPT', '1LT', '2LT'];
    const isTargetOfficer = officerRanks.includes(trooperInfo.rank);
    
    console.log(`Target user is officer: ${isTargetOfficer}`);
    
    // Get a fresh member object for Discord operations
    let member;
    try {
      member = await interaction.guild.members.fetch(discordId);
    } catch (error) {
      console.error('Error fetching member:', error);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `There was an error fetching ${targetUser.username}'s Discord profile. Please make sure they are in the server.`
          : 'There was an error fetching your Discord profile. Please contact an administrator.',
        ephemeral: true
      });
      return;
    }
    
    // Get the bot member for permission checks
    let botMember;
    try {
      botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    } catch (error) {
      console.error('Error fetching bot member:', error);
      botMember = null;
    }
    
    // Initialize the formatted nickname variable here
    let formattedNickname = trooperInfo.name;
    let nicknameSetSuccess = false;
    
    // Try to set the user's nickname
    try {
      // Check if we can modify the nickname
      const canModifyNickname = 
        member.id !== interaction.guild.ownerId && 
        botMember && 
        member.roles.highest.position < botMember.roles.highest.position;
      
      if (canModifyNickname) {
        // Get the lorename from the API response
        if (trooperInfo.lorename) {
          console.log(`Found lorename: ${trooperInfo.lorename} for trooper: ${trooperInfo.name}`);
          
          // Remove the "212" prefix if it exists
          let cleanLoreName = trooperInfo.lorename.replace(/^212\s*/i, '');
          
          // Process special company cases (case insensitive)
          if (/BARLEX/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 01 Barlex | ${trooperInfo.name}`;
          } else if (/CALE/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 02 Cale | ${trooperInfo.name}`;
          } else if (/REED/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 03 Reed | ${trooperInfo.name}`;
          } else if (/WYLER/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 04 Wyler | ${trooperInfo.name}`;
          } else if (/NOVA/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 05 Nova | ${trooperInfo.name}`;
          } else {
            // For other lorenames, apply proper capitalization
            // Split by spaces and capitalize each word
            const formattedLoreName = cleanLoreName
              .split(' ')
              .map(word => {
                // Skip empty words
                if (!word) return '';
                
                // Capitalize first letter, lowercase the rest
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              })
              .join(' ');
            
            // Add the lorename as a prefix if it's not empty
            if (formattedLoreName.trim() !== '') {
              formattedNickname = `${formattedLoreName} | ${trooperInfo.name}`;
            }
          }
        } else {
          console.log(`No lorename found for trooper: ${trooperInfo.name}, using default name`);
          
          // If no lorename, fall back to company information
          if (trooperInfo.company === '212AB') {
            // No special formatting for 2AB
            formattedNickname = trooperInfo.name;
          }
        }
        
        console.log(`Setting nickname to: ${formattedNickname}`);
        
        // Set the nickname
        await member.setNickname(formattedNickname);
        nicknameSetSuccess = true;
        console.log(`Successfully set nickname for ${discordId} to ${formattedNickname}`);
      } else {
        console.log(`Cannot set nickname for ${discordId} - insufficient permissions`);
      }
    } catch (error) {
      console.error('Error setting nickname:', error);
      // Continue with the registration process even if setting the nickname fails
    }
    
    // For the role assignment part
    try {
      // Prepare roles to add
      const rolesToAdd = [];
      
      // Add 212th role if defined
      if (process.env['212TH_ROLE'] && process.env['212TH_ROLE'].trim() !== '') {
        rolesToAdd.push(process.env['212TH_ROLE']);
      } else {
        // Fallback to hardcoded role ID
        rolesToAdd.push('1332687042756481065');
      }
      
      // Add enlisted role if defined
      if (process.env.ENLISTED_ROLE && process.env.ENLISTED_ROLE.trim() !== '') {
        rolesToAdd.push(process.env.ENLISTED_ROLE);
      } else {
        // Fallback to hardcoded role ID
        rolesToAdd.push('1359286513518645399');
      }
      
      // Check if user is in 212AB based on API information
      const is212AB = trooperInfo.company === '212AB';
      
      // If we determined the user is in 212AB, add the role
      if (is212AB) {
        if (process.env['2AB_ROLE'] && process.env['2AB_ROLE'].trim() !== '') {
          rolesToAdd.push(process.env['2AB_ROLE']);
        } else {
          // Fallback to hardcoded 2AB role ID if needed
          rolesToAdd.push('1359286513518645400'); // Replace with actual 2AB role ID
        }
        console.log(`Adding 2AB role to ${discordId} based on company information`);
      }
      
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
      }
      const rolesToRemove = [];
      rolesToRemove.push(process.env['SHINY_ROLE']);
      rolesToRemove.push(process.env['CADET_ROLE']);
      await member.roles.remove(rolesToRemove);
      // Register the user in the database
      console.log(`Registering user ${discordId} in database with SteamID ${steamId} and officer status ${isTargetOfficer}`);
      const registrationResult = await registerUserInDatabase(discordId, steamId, isTargetOfficer);

      if (!registrationResult.success) {
        console.error(`Failed to register user in database: ${registrationResult.message}`);
        await interaction.editReply({
          content: `Error: ${registrationResult.message}`,
          ephemeral: true
        });
        return;
      }

      console.log(`Successfully registered user ${discordId} in database`);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `Successfully registered ${targetUser.username}! Their nickname has been set to: ${formattedNickname}${isTargetOfficer ? ' (Officer status recognized)' : ''}${is212AB ? ' (2AB member)' : ''}`
          : `Registration successful! Your nickname has been set to: ${formattedNickname}${isTargetOfficer ? ' (Officer status recognized)' : ''}${is212AB ? ' (2AB member)' : ''}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error assigning roles:', error);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `Registration successful, but there was an error assigning roles to ${targetUser.username}. Please contact an administrator. Their trooper name is: ${formattedNickname}`
          : `Registration successful, but there was an error assigning roles. Please contact an administrator. Your trooper name is: ${formattedNickname}`,
        ephemeral: true
      });
    }
  }
};
