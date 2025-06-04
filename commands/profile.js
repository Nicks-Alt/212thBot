const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');
const moment = require('moment');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Class mapping for readable display
const CLASS_DISPLAY = {
  'ARFLOW': 'ARF Trooper',
  'ARFHIGH': 'ARF Officer',
  'MEDICLOW': 'Medic Trooper',
  'MEDICHIGH': 'Medic Officer',
  'HEAVY': 'Heavy Trooper',
  'HEAVYOFFICER': 'Heavy Officer',
  'JEDIKNIGHTC': 'Jedi Knight',
  'JEDICONSULARC': 'Jedi Consular',
  'JEDIGUARDIANC': 'Jedi Guardian',
  'JEDISENTINELC': 'Jedi Sentinel',
  'JEDIWEPEXPERT': 'Jedi Exotic Weapon Specialist',
  'JEDILIB': 'Jedi Librarian',
  'JEDILK': 'Jedi Lorekeeper',
  'JEDIBM': 'Jedi Battlemaster',
  'JEDIMASTERC': 'Jedi Master'
};

// Function to format lorename
function formatLoreName(loreName) {
  if (!loreName) return 'None';
  
  // Remove the "212" prefix if it exists
  let cleanName = loreName.replace(/^212\s*/, '');
  
  // Format based on company name (case insensitive)
  if (/BARLEX/i.test(cleanName)) {
    return 'Parjai 01 Barlex';
  } else if (/CALE/i.test(cleanName)) {
    return 'Parjai 02 Cale';
  } else if (/REED/i.test(cleanName)) {
    return 'Parjai 03 Reed';
  } else if (/WYLER/i.test(cleanName)) {
    return 'Parjai 04 Wyler';
  } else if (/NOVA/i.test(cleanName)) {
    return 'Parjai 05 Nova';
  }
  
  // For other names, apply proper capitalization
  // Split by spaces and capitalize each word
  return cleanName
    .split(' ')
    .map(word => {
      // Skip empty words
      if (!word) return '';
      
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

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
      return null;
    }
    
    return player;
  } catch (error) {
    console.error('Error fetching info from SuperiorServers API:', error.message);
    return null;
  }
}

// Helper function to check a specific battalion endpoint
async function checkBattalionEndpoint(battalion, steamID) {
  try {
    const targetUrl = `https://superiorservers.co/api/ssrp/cwrp/groupinfo/${battalion}`;
    
    console.log(`Attempting to access: ${targetUrl} to find SteamID: ${steamID}`);
    
    // Make the API request with cookies and user agent
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://superiorservers.co/',
        'Origin': 'https://superiorservers.co',
        'Cookie': 'ss_session=1; ss_lastvisit=' + Math.floor(Date.now() / 1000)
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Check if the request was successful
    if (!response.data || !response.data.success || !response.data.response || !response.data.response.players) {
      console.error(`API request for ${battalion} returned unsuccessful response or no players`);
      return null;
    }
    
    // Log the number of players found
    console.log(`Found ${response.data.response.players.length} players in ${battalion}`);
    
    // Find all players with matching SteamID
    const matchingPlayers = response.data.response.players.filter(p => p.steamid === steamID);
    
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
        return true; // Keep players with no tags
      }
      
      // Check if the player has the tag we're filtering
      const hasFilterTag = player.tags.some(tag => tag === tagToFilter);
      
      if (hasFilterTag) {
        console.log(`Skipping character ${player.name} (${player.characterid}) because it has the ${tagToFilter} tag`);
        return false;
      }
      
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
    console.error(`Error fetching info from ${battalion} API:`, error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Function to get SteamID from Discord ID using cache
async function getSteamIdFromDiscordId(discordId) {
  try {
    const rows = await cacheManager.getCachedSheetData(
      process.env.OFFICER_SPREADSHEET_ID,
      `'Bot'!A2:B`,
      'registrationdata'
    );
    
    const userRow = rows.find(row => row[0] === discordId);
    
    return userRow ? userRow[1] : null;
  } catch (error) {
    console.error('Error getting SteamID from Discord ID:', error);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your 212th Attack Battalion profile')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check profile for')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if the command is being used to look up another user
      const targetUser = interaction.options.getUser('user');
      const isLookingUpOtherUser = targetUser !== null;
      
      // Determine which user to look up
      const userToLookup = isLookingUpOtherUser ? targetUser : interaction.user;
      
      // Get the Discord ID of the user to look up
      const discordId = userToLookup.id;
      
      // Get the SteamID from the Bot database using cache
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
      
      // Get the user's information from the API
      console.log(`Looking up SteamID: ${steamId}`);
      const trooperInfo = await getTrooperInfoFromSteamID(steamId);
      
      if (!trooperInfo) {
        await interaction.editReply({
          content: `Could not find information for ${isLookingUpOtherUser ? userToLookup.username : 'you'} in the 212th database.`,
          ephemeral: true
        });
        return;
      }
      
      // Format dates for better readability
      const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return moment(dateString).format('MMM DD, YYYY [at] HH:mm');
      };
      
      // Get the class display name
      const classDisplay = CLASS_DISPLAY[trooperInfo.class] || trooperInfo.class || 'None';
      
      // Format the lorename
      const formattedLoreName = formatLoreName(trooperInfo.lorename);
      
      // Get user's avatar URL
      const avatarUrl = userToLookup.displayAvatarURL({ size: 256, dynamic: true });
      
      // Create an embed with the user's information
      const embed = new EmbedBuilder()
        .setTitle(`212th Attack Battalion - Trooper Profile`)
        .setColor('#FF8C00')
        .setThumbnail(avatarUrl) // Use the user's avatar instead of the static image
        .addFields(
          // First row - Basic info
          { name: 'Name', value: trooperInfo.name, inline: true },
          { name: 'Rank', value: trooperInfo.rid, inline: true },
          { name: 'Battalion', value: trooperInfo.groupid, inline: true },
    
          // Second row - Character details
          { name: 'Character ID', value: trooperInfo.characterid.toString(), inline: true },
          { name: 'Class', value: classDisplay, inline: true },
          { name: 'Lore Character', value: formattedLoreName, inline: true },
    
          // SteamID gets its own row to avoid cutoff
          { name: 'SteamID', value: steamId, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
      
      // Add dates in a row if available
      const dateFields = [];

      if (trooperInfo.added) {
        dateFields.push({ name: 'Joined', value: formatDate(trooperInfo.added), inline: true });
      }

      if (trooperInfo.ridupdated) {
        dateFields.push({ name: 'Last Promotion', value: formatDate(trooperInfo.ridupdated), inline: true });
      }

      if (trooperInfo.lastseen) {
        dateFields.push({ name: 'Last Seen', value: formatDate(trooperInfo.lastseen), inline: true });
      }

      if (dateFields.length > 0) {
        embed.addFields(dateFields);
      }
      
      // Promoter gets its own row if available
      if (trooperInfo.promoter) {
        embed.addFields({ name: 'Last Promoted By', value: trooperInfo.promoter, inline: false });
      }
      
      // Send the embed
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing profile command:', error);
      await interaction.editReply({
        content: `An error occurred while retrieving profile: ${error.message}`,
        ephemeral: true
      });
    }
  }
};