const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const { google } = require('googleapis');
const cacheManager = require('./cacheManager');

// Create the Discord client and commands collection
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Status index to track which status to show next
let statusIndex = 0;

// Function to cycle through statuses in order
function cycleStatus() {
  const statuses = [
    { name: 'Obi-Wan crash', type: 3 },      // WATCHING
    { name: 'Cody fighting', type: 1 },      // STREAMING
    { name: 'with wires', type: 0 }          // PLAYING
  ];
  
  // Get the current status based on the index
  const currentStatus = statuses[statusIndex];
  
  // Update the index for next time (cycle back to 0 when we reach the end)
  statusIndex = (statusIndex + 1) % statuses.length;
  
  // Set the presence
  client.user.setPresence({
    activities: [{ 
      name: currentStatus.name, 
      type: currentStatus.type,
      url: currentStatus.type === 1 ? 'https://www.twitch.tv/212thattackbattalion' : null // URL required for STREAMING
    }],
    status: 'online'
  });
  
  console.log(`Status set to: ${currentStatus.type === 0 ? 'Playing' : currentStatus.type === 1 ? 'Streaming' : 'Watching'} ${currentStatus.name}`);
}

// Set up the Google Sheets API for read-only operations
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
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
    // Force a fresh fetch from the spreadsheet to avoid cache issues
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`, // Include column C
      valueRenderOption: 'UNFORMATTED_VALUE' // Get raw values
    });

    const rows = response.data.values || [];
    // Filter out empty rows first
    const nonEmptyRows = rows.filter(row => row && row.length > 0 && row[0]);
    const existingEntry = nonEmptyRows.find(row => row[0] === discordId);
    
    console.log(`Registration check for ${discordId}: ${!!existingEntry}`);
    return !!existingEntry; // Convert to boolean
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false; // Default to not registered on error
  }
}

/**
 * Checks if a user is an officer
 * @param {string} discordId - The Discord ID of the user
 * @returns {Promise<boolean>} - Whether the user is an officer
 */
async function isUserOfficer(discordId) {
  try {
    // Force a fresh fetch from the spreadsheet to avoid cache issues
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
      range: `'Bot'!A2:C1000`,
      valueRenderOption: 'UNFORMATTED_VALUE' // Get raw values
    });

    const rows = response.data.values || [];
    // Filter out empty rows first
    const nonEmptyRows = rows.filter(row => row && row.length > 0 && row[0]);
    const userRow = nonEmptyRows.find(row => row[0] === discordId);
    
    // Check for various possible "true" values
    const isOfficer = userRow && userRow.length > 2 && 
           (userRow[2] === true || 
            userRow[2] === "TRUE" || 
            userRow[2] === "true" || 
            userRow[2] === 1 ||
            String(userRow[2]).toLowerCase() === "true");
    
    console.log(`Officer check for ${discordId}: ${isOfficer}, value: ${userRow ? userRow[2] : 'user not found'}`);
    return isOfficer;
  } catch (error) {
    console.error('Error checking officer status:', error);
    return false; // Default to not an officer on error
  }
}

// Global variable to track current status index
let currentStatusIndex = 0;

// Function to set the next status in rotation
function setNextStatus() {
  try {
    const statuses = [
      { name: 'Obi-Wan crash', type: 3 },      // WATCHING
      { name: 'Cody fighting', type: 1 },      // STREAMING
      { name: 'with wires', type: 0 }          // PLAYING
    ];
    
    // Get the next status in rotation
    const status = statuses[currentStatusIndex];
    
    // Update index for next time
    currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
    
    console.log(`Setting status to: ${status.type === 0 ? 'Playing' : status.type === 1 ? 'Streaming' : 'Watching'} ${status.name}`);
    
    // Set the presence
    client.user.setPresence({
      activities: [{ 
        name: status.name, 
        type: status.type,
        url: status.type === 1 ? 'https://www.twitch.tv/212thattackbattalion' : null
      }],
      status: 'online'
    });
  } catch (error) {
    console.error('Error setting status:', error);
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
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Set initial status to "Loading..."
  client.user.setPresence({
    activities: [{ name: 'Loading...', type: 3 }], // Type 3 is "WATCHING"
    status: 'dnd' // Red "Do Not Disturb" status while loading
  });
  
  // Initialize the cache when the bot is ready
  try {
    await cacheManager.initializeCache();
    // Set up periodic cache refresh every 10 minutes
    cacheManager.setupPeriodicCacheRefresh(4);
    console.log('Cache initialized successfully');
  } catch (error) {
    console.error('Error initializing cache:', error);
    console.log('Continuing without cache initialization. Data will be fetched as needed.');
  }
  
  // After a short delay, start cycling through statuses
  setTimeout(() => {
    // Set the first status
    cycleStatus();
    
    // Set up interval to change status every 10 seconds
    setInterval(cycleStatus, 10 * 1000);
  }, 5000); // 5 second delay to show loading status
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
    
    // Force a fresh check of registration status
    const isRegistered = await isUserRegistered(interaction.user.id);
    console.log(`User ${interaction.user.tag} registration status: ${isRegistered}`);
    
    if (!isRegistered) {
      await interaction.editReply({ 
        content: 'You must be registered to use this command. Please use `/register` with your SteamID to register first.', 
        ephemeral: true 
      });
      return;
    }
    
    // Check if command requires officer status
    const requiresOfficer = command.requiresOfficer || 
                           ['embed', 'loacheck'].includes(interaction.commandName);
    
    if (requiresOfficer) {
      const isOfficer = await isUserOfficer(interaction.user.id);
      console.log(`User ${interaction.user.tag} officer status: ${isOfficer}`);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'This command is only available to officers.',
          ephemeral: true
        });
        return;
      }
    }
    
    // User is registered and has appropriate permissions, execute the command
    await command.execute(interaction);
  } catch (error) {
    // console.error(`Error executing command ${interaction.commandName}:`, error);
    
    // try {
    //   // Handle the error response based on the interaction state
    //   if (interaction.deferred) {
    //     await interaction.editReply({ 
    //       content: 'There was an error executing this command. Please try again later.', 
    //       ephemeral: true 
    //     });
    //   // } else if (!interaction.replied) {
    //   //   await interaction.editReply({ 
    //   //     content: 'There was an error executing this command. Please try again later.', 
    //   //     ephemeral: true 
    //   //   });
    //   } else {
    //     await interaction.followUp({ 
    //       content: 'There was an error executing this command. Please try again later.', 
    //       ephemeral: true 
    //     });
    //   }
    // } catch (followUpError) {
    //   console.error('Error sending error message:', followUpError);
    // }
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
