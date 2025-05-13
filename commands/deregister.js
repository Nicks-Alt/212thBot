const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deregister')
    .setDescription('Remove your registration from the 212th Attack Battalion system'),

  async execute(interaction) {
    // Note: We don't need to defer the reply here since index.js already does that
    // for all commands except register, aar, help, about, info
    
    // Get the user's Discord ID
    const discordId = interaction.user.id;
    
    // Check if the user is registered
    const isRegistered = await checkUserRegistration(discordId);
    
    if (!isRegistered) {
      await interaction.editReply({
        content: 'You are not currently registered in our system.',
        ephemeral: true
      });
      return;
    }
    
    // Deregister the user
    const deregistrationResult = await deregisterUser(discordId);
    
    if (!deregistrationResult.success) {
      await interaction.editReply({
        content: deregistrationResult.message,
        ephemeral: true
      });
      return;
    }
    
    // Try to remove the roles
    try {
      const member = await interaction.guild.members.fetch(discordId);
      
      // Remove the 212th roles (same as in register.js)
      await member.roles.remove(['1359286513518645399', '1332687042756481065']);
      
      // Send success message
      await interaction.editReply({
        content: 'You have been successfully deregistered from the 212th Attack Battalion system. Your roles have been removed.',
        ephemeral: true
      });
    } catch (error) {
      console.error('Error removing roles:', error);
      await interaction.editReply({
        content: 'You have been successfully deregistered from the 212th Attack Battalion system, but there was an error removing your roles. Please contact an administrator.',
        ephemeral: true
      });
    }
  }
};

// Function to check if a user is registered
async function checkUserRegistration(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:B1000`,
    });

    const rows = response.data.values || [];
    return rows.some(row => row[0] === discordId);
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

// Function to deregister a user
async function deregisterUser(discordId) {
  try {
    // Get all entries from the Bot sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`,
    });

    const rows = response.data.values || [];
    
    // Find the user's row
    const userRowIndex = rows.findIndex(row => row[0] === discordId);
    
    if (userRowIndex === -1) {
      return { success: false, message: 'You are not registered in our system.' };
    }
    
    // Calculate the actual row number in the spreadsheet (add 2 because we start from row 2 and arrays are 0-indexed)
    const actualRowNumber = userRowIndex + 2;
    
    // Clear the user's row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A${actualRowNumber}:C${actualRowNumber}`,
    });
    
    console.log(`Deregistered user with Discord ID ${discordId} from row ${actualRowNumber}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error deregistering user:', error);
    return { success: false, message: 'An error occurred while deregistering. Please try again later.' };
  }
}