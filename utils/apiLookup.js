const axios = require('axios');

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

module.exports = { checkBattalionEndpoint };