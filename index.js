const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const { google } = require('googleapis');

// Create the Discord client and commands collection
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Set up the Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',  // Path to your service account JSON file
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Checks if a user is registered in the system
 * @param {string} discordId - The Discord ID of the user
 * @returns {Promise<boolean>} - Whether the user is registered
 */
async function isUserRegistered(discordId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:B1000`, // Adjust range as needed
    });

    const rows = response.data.values || [];
    const existingEntry = rows.find(row => row[0] === discordId);
    
    return !!existingEntry; // Convert to boolean
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false; // Default to not registered on error
  }
}

// Register the slash commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

// Loop through and add commands to the collection
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] The command at ${filePath} is missing required "data" or "execute" properties.`);
  }
}

// Register slash commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

// Bot ready event handler
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Command interaction handler - UPDATED FOR RELIABILITY
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName}`);
    return;
  }

  // Log command usage
  console.log(`Command ${interaction.commandName} executed by ${interaction.user.tag} (${interaction.user.id})`);

  try {
    // Skip deferring for commands that use modals or don't need registration
    if (['register', 'aar', 'help', 'about', 'info'].includes(interaction.commandName)) {
      await command.execute(interaction);
      return;
    }

    // For all other commands, defer reply and check registration
    await interaction.deferReply({ ephemeral: true });
    
    const isRegistered = await isUserRegistered(interaction.user.id);
    
    if (!isRegistered) {
      await interaction.editReply({ 
        content: 'You must be registered to use this command. Please use `/register` with your SteamID to register first.', 
        ephemeral: true 
      });
      return;
    }
    
    // User is registered, execute the command
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    try {
      // Handle the error response based on the interaction state
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error executing this command. Please try again later.', 
          ephemeral: true 
        });
      } else if (!interaction.replied) {
        await interaction.reply({ 
          content: 'There was an error executing this command. Please try again later.', 
          ephemeral: true 
        });
      } else {
        await interaction.followUp({ 
          content: 'There was an error executing this command. Please try again later.', 
          ephemeral: true 
        });
      }
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
