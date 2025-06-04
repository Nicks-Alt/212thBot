const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const { google } = require('googleapis');

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
      url: currentStatus.type === 1 ? 'https://www.twitch.tv/' : null // URL required for STREAMING
    }],
    status: 'online'
  });
  
  console.log(`Status set to: ${currentStatus.type === 0 ? 'Playing' : currentStatus.type === 1 ? 'Streaming' : 'Watching'} ${currentStatus.name}`);
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
  
  // After a short delay, start cycling through statuses
  setTimeout(() => {
    // Set the first status
    cycleStatus();
    
    // Set up interval to change status every 10 seconds
    setInterval(cycleStatus, 10 * 1000);
  }, 5000); // 5 second delay to show loading status
});

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

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
    if (['register', 'aar', 'help'].includes(interaction.commandName)) {
      await command.execute(interaction);
      return;
    }
    // For all other commands, defer reply and check registration
    await interaction.deferReply({ ephemeral: true });
    
    // Force a fresh check of registration status
    const {isUserRegistered} = require('./utils/isUserRegistered');
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
      const {isUserOfficer} = require('./utils/isUserOfficer');
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
  } catch (error) {}
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
