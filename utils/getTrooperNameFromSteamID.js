const { checkBattalionEndpoint } = require('./apiLookup');

async function getTrooperNameFromSteamID(steamID) {
  try {
    console.log(`Looking up name for SteamID: ${steamID}`);
    
    // First try 212th battalion
    let player = await checkBattalionEndpoint('212th', steamID);
    
    // If not found in 212th, try 501st
    if (!player) {
      console.log(`Player not found in 212th, trying 212AB...`);
      player = await checkBattalionEndpoint('212AB', steamID);
    }
    
    // If player found, return their name
    if (player && player.name) {
      console.log(`Found player name: ${player.name}`);
      return player.name;
    }
    
    console.log(`No player found for SteamID: ${steamID}`);
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching name from API:', error);
    return 'Unknown';
  }
}

module.exports = { getTrooperNameFromSteamID };