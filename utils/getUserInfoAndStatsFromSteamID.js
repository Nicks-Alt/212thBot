const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Helper function to get user info and statistics from SteamID using direct API calls
async function getUserInfoAndStatsFromSteamID(steamID) {
  try {
    console.log(`Looking up info and stats for SteamID: ${steamID}`);
    
    // Get statistics from the Statistics sheet
    const statsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `'Stats'!A2:AA1000`,
    });
    
    const rows = statsResponse.data.values || [];
    
    console.log(`Got ${rows.length} rows from statistics sheet`);
    
    // SteamID is in column C (index 2)
    const userRow = rows.find(row => row && row[2] === steamID);
    
    if (!userRow) {
      console.log(`No statistics found for SteamID: ${steamID}`);
      
      // If not found in statistics, try to get basic info from main sheet
      try {
        const mainResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: `'Main'!A3:F1000`,
        });
        
        const mainRows = mainResponse.data.values || [];
        const mainResult = mainRows.find(row => row && row[3] === steamID); // SteamID is in column F (index 3 in C:H range)
        
        if (mainResult) {
          console.log(`Found basic info in main sheet for SteamID: ${steamID}`);
          return {
            userInfo: {
              name: mainResult[2] || 'Unknown', // Name is in column E (index 2 in C:H range)
              rank: mainResult[0] || 'Unknown'  // Rank is in column C (index 0 in C:H range)
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

module.exports = {getUserInfoAndStatsFromSteamID}