const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to get trooper name from SteamID
async function getTrooperInfoFromSteamID(steamID) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
      range: `'212th Attack Battalion'!A2:F1000`, // Adjust range as needed
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

// Function to register user in the OFFICER database
async function registerUserInDatabase(discordId, steamId, isOfficer) {
  try {
    // First, check if the user is already registered
    const checkResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`, // Adjust range to include column C
    });

    const rows = checkResponse.data.values || [];
    const existingEntry = rows.find(row => row[0] === discordId || row[1] === steamId);
    
    if (existingEntry) {
      return { success: false, message: 'You are already registered in our system.' };
    }

    // Find the first empty row
    let emptyRowIndex = 2; // Start from row 2 (after headers)
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i][0]) {
        emptyRowIndex = i + 2; // +2 because we start from row 2 and array is 0-indexed
        break;
      }
      emptyRowIndex = i + 3; // Next row after the last filled one
    }

    // Insert the new data including officer status as a boolean
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A${emptyRowIndex}:C${emptyRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[discordId, steamId, isOfficer ? true : false]]
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error registering user in database:', error);
    return { success: false, message: 'An error occurred while registering. Please try again later.' };
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
    ),

  async execute(interaction) {
    // Defer the reply to give time for database operations
    await interaction.deferReply({ ephemeral: true });
    
    // Get the SteamID from the command option
    const steamId = interaction.options.getString('steamid');
    
    // Get the user's Discord ID
    const discordId = interaction.user.id;
    
    // Look up the trooper info from the main database
    const trooperInfo = await getTrooperInfoFromSteamID(steamId);
    
    if (trooperInfo.name === 'Unknown') {
      await interaction.editReply({
        content: 'Your SteamID was not found in our database. Please verify your SteamID and try again, or contact an administrator for assistance.',
        ephemeral: true
      });
      return;
    }
    
    // Check if the user is an officer
    const officerRanks = ['CDR', 'XO', 'COL', 'LTC', 'MAJ', 'CPT', '1LT', '2LT'];
    const isOfficer = officerRanks.includes(trooperInfo.rank);
    
    // Register the user in the database with officer status
    const registrationResult = await registerUserInDatabase(discordId, steamId, isOfficer);
    
    if (!registrationResult.success) {
      await interaction.editReply({
        content: registrationResult.message,
        ephemeral: true
      });
      return;
    }
    
    // Try to set the user's nickname
    try {
      // Get a fresh member object directly from the guild
      const member = await interaction.guild.members.fetch(discordId);
      
      // Check if the user is the server owner
      if (member.id === interaction.guild.ownerId) {
        console.log(`Cannot set nickname for ${discordId} - user is the server owner`);
        // Continue with role assignment
      } else {
        // Check role hierarchy
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        
        if (member.roles.highest.position >= botMember.roles.highest.position) {
          console.log(`Cannot set nickname for ${discordId} - user's role is higher than bot's highest role`);
          // Continue with role assignment
        } else {
          // Try to set the nickname
          await member.setNickname(trooperInfo.name);
          console.log(`Successfully set nickname for ${discordId} to ${trooperInfo.name}`);
        }
      }
    } catch (error) {
      console.error('Error setting nickname:', error);
      // Continue with the registration process even if setting the nickname fails
    }
    
    // Assign the specified roles
    try {
      const member = await interaction.guild.members.fetch(discordId);
      await member.roles.add(['1359286513518645399', '1332687042756481065']);
      
      // Send success message
      await interaction.editReply({
        content: `Registration successful! Your nickname has been set to: ${trooperInfo.name}${isOfficer ? ' (Officer status recognized)' : ''}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error assigning roles:', error);
      await interaction.editReply({
        content: `Registration successful, but there was an error assigning roles. Please contact an administrator. Your trooper name is: ${trooperInfo.name}`,
        ephemeral: true
      });
    }
  }
};
