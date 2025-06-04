const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available commands for the 212th Attack Battalion bot'),

  async execute(interaction) {
    // Defer reply since this command might take a moment to check officer status
    await interaction.deferReply({ ephemeral: true });
    
    // Check if the user is registered
    const {isUserRegistered} = require('../utils/isUserRegistered.js');
    const isRegistered = await isUserRegistered(interaction.user.id);
    
    // Check if the user is an officer (only if they're registered)
    const {isUserOfficer} = require('../utils/isUserOfficer.js');
    const isOfficer = isRegistered ? await isUserOfficer(interaction.user.id) : false;
    
    // Default values from embed.js
    const defaultHeaderText = "212th Attack Battalion";
    const defaultHeaderImage = "https://images-ext-1.discordapp.net/external/M6J5nBNv1fqh7byVIHYR0gnOtTj4CPoSzARV3SMiK1s/https/images-ext-1.discordapp.net/external/PzTY93BIRblNJkgdcxO39n5zCuUxyr2EZRrjXRbvY0E/https/cdn.discordapp.com/emojis/755600680651325490.webp";
    const defaultFooterText = "212th Attack Battalion";
    const defaultFooterImage = defaultHeaderImage;
    const defaultThumbnail = "https://i.imgur.com/ushtI24.png";
    const defaultColor = "#FF8C00";
    
    // Create an embed for the help message
    const helpEmbed = new EmbedBuilder()
      .setColor(defaultColor)
      .setTitle('Available Commands')
      .setDescription('Here are the commands available to you:')
      .setThumbnail(defaultThumbnail)
      .setAuthor({ 
        name: defaultHeaderText,
        iconURL: defaultHeaderImage
      })
      .setFooter({ 
        text: defaultFooterText, 
        iconURL: defaultFooterImage 
      })
      .setTimestamp();
    
    // Get all command files from the commands directory
    const commandsPath = path.join(__dirname, '..');
    const commandFiles = fs.readdirSync(path.join(commandsPath, 'commands')).filter(file => file.endsWith('.js'));
    
    // Arrays to store categorized commands
    const publicCommands = [
      { name: 'help', description: 'Display this help message' }, // Manually add help command
      { name: 'register', description: 'Register your SteamID with the 212th Attack Battalion' }
    ];
    const registeredCommands = [
      { name: 'stats', description: 'View your 212th Attack Battalion statistics' }, // Manually add stats command
      { name: 'aar', description: 'Submit an After Action Report' }, // Manually add aar command
      { name: 'checkbl', description: 'Check if a SteamID is blacklisted or not.' }, // Manually add checkbl command
    ];
    const officerCommands = [];
    
    // Commands that don't require registration check (from index.js)
    const noRegistrationCheck = ['register', 'help', 'about', 'info'];
    
    // Process each command file
    for (const file of commandFiles) {
      try {
        // Skip help.js since we manually added it
        if (file === 'help.js') continue;
        // Skip stats.js since we manually added it
        if (file === 'stats.js') continue;
        // Skip aar.js since we manually added it
        if (file === 'aar.js') continue;
        // Skip register.js since we manually added it
        if (file === 'register.js') continue;
        // Skip checkbl.js since we manually added it
        if (file === 'checkbl.js') continue;
        
        const filePath = path.join(commandsPath, 'commands', file);
        const command = require(filePath);
        
        if (command.data && command.data.name) {
          const commandName = command.data.name;
          const description = command.data.description || 'No description available';
          
          // Read the file content to check for officer or registration checks
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Check if command is officer-only
          const isOfficerOnly = 
            fileContent.includes('PermissionFlagsBits') || 
            fileContent.includes('isUserOfficer') ||
            commandName.startsWith('force') || 
            ['embed', 'addbl', 'removebl', 'viewaar', 'announce'].includes(commandName);
          
          // Categorize the command
          if (isOfficerOnly) {
            officerCommands.push({ name: commandName, description });
          } else if (!noRegistrationCheck.includes(commandName)) {
            registeredCommands.push({ name: commandName, description });
          } else {
            publicCommands.push({ name: commandName, description });
          }
        }
      } catch (error) {
        console.error(`Error processing command file ${file}:`, error);
      }
    }
    
    // Add public commands (available to everyone)
    if (publicCommands.length > 0) {
      helpEmbed.addFields(
        { name: '📝 Public Commands', value: 'Available to everyone:' }
      );
      
      for (const cmd of publicCommands) {
        helpEmbed.addFields({ name: `/${cmd.name}`, value: cmd.description });
      }
    }
    
    // Add commands for registered users
    if (isRegistered && registeredCommands.length > 0) {
      helpEmbed.addFields(
        { name: '🔒 Registered User Commands', value: 'Available after registration:' }
      );
      
      for (const cmd of registeredCommands) {
        helpEmbed.addFields({ name: `/${cmd.name}`, value: cmd.description });
      }
    }
    
    // Add officer commands
    if (isOfficer && officerCommands.length > 0) {
      helpEmbed.addFields(
        { name: '👑 Officer Commands', value: 'Available to officers only:' }
      );
      
      for (const cmd of officerCommands) {
        helpEmbed.addFields({ name: `/${cmd.name}`, value: cmd.description });
      }
    }
    
    // Add note for unregistered users
    if (!isRegistered && registeredCommands.length > 0) {
      helpEmbed.addFields(
        { name: 'Note', value: 'Additional commands will be available after you register with `/register`.' }
      );
    }
    
    // Send the help embed
    await interaction.editReply({
      embeds: [helpEmbed],
      ephemeral: true
    });
  }
};

