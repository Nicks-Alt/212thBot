// Function to get trooper info from SteamID using the direct API endpoints
async function getTrooperInfoFromSteamID(steamID) {
  try {
    // Make sure the steamID is properly formatted
    const formattedSteamID = steamID.trim();
    // First check the 212th endpoint
    const {checkBattalionEndpoint} = require('./checkBattalionEndpoint');
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

module.exports = {getTrooperInfoFromSteamID}