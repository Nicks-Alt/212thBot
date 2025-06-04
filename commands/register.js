const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your SteamID with the 212th Attack Battalion')
    .addStringOption(option =>
      option
        .setName('steamid')
        .setDescription('Your Steam ID (e.g., STEAM_0:1:12345678)')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to register (officers only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Defer the reply immediately to prevent the "InteractionNotReplied" error
    await interaction.deferReply({ephemeral: true});
    
    // Get the SteamID from the command option
    const steamId = interaction.options.getString('steamid');
    console.log(`DEBUG: Registration attempt with SteamID: ${steamId}`);
    
    // Check if registering another user
    const targetUser = interaction.options.getUser('user');
    const isRegisteringOtherUser = targetUser !== null;
    
    // If registering another user, check if the requester is an officer
    if (isRegisteringOtherUser) {
      const {isUserOfficer} = require('../utils/isUserOfficer');
      const isOfficer = await isUserOfficer(interaction.user.id);
      
      if (!isOfficer) {
        await interaction.editReply({
          content: 'You must be an officer to register other users.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Officer ${interaction.user.tag} is registering user ${targetUser.tag}`);
    }
    
    // Get the Discord ID of the user to register
    const discordId = isRegisteringOtherUser ? targetUser.id : interaction.user.id;
    
    // Check if the user is already registered
    const {isUserRegistered} = require('../utils/isUserRegistered');
    const alreadyRegistered = await isUserRegistered(discordId, steamId);
    
    if (alreadyRegistered) {
      console.log(`User ${discordId} is already registered`);
      await interaction.editReply({
        content: isRegisteringOtherUser 
          ? `${targetUser.username} is already registered in our system.`
          : 'You are already registered in our system.',
        ephemeral: true
      });
      return;
    }
    
    // Get trooper info from the API
    console.log(`Looking up SteamID: ${steamId}`);
    const {getTrooperInfoFromSteamID} = require('../utils/getTrooperInfoFromSteamID');
    const trooperInfo = await getTrooperInfoFromSteamID(steamId);
    // If trooper not found, inform them they aren't registered
    if (!trooperInfo) {
      console.log(`Trooper not found for SteamID: ${steamId}`);
      await interaction.editReply({
        content: 'Sorry, it seems you are not registered in our system. Please contact an officer for assistance.',
        ephemeral: true
      });
      return;
    }
    console.log(`Found trooper: ${trooperInfo.name}, Rank: ${trooperInfo.rank}, Company: ${trooperInfo.company}`);
    
    // Check if the user is an officer
    const officerRanks = ['CDR', 'XO', 'COL', 'LTC', 'MAJ', 'CPT', '1LT', '2LT'];
    const isTargetOfficer = officerRanks.includes(trooperInfo.rank);
    
    console.log(`Target user is officer: ${isTargetOfficer}`);
    
    // Get a fresh member object for Discord operations
    let member;
    try {
      member = await interaction.guild.members.fetch(discordId);
    } catch (error) {
      console.error('Error fetching member:', error);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `There was an error fetching ${targetUser.username}'s Discord profile. Please make sure they are in the server.`
          : 'There was an error fetching your Discord profile. Please contact an administrator.',
        ephemeral: true
      });
      return;
    }
    
    // Get the bot member for permission checks
    let botMember;
    try {
      botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    } catch (error) {
      console.error('Error fetching bot member:', error);
      botMember = null;
    }
    
    // Initialize the formatted nickname variable here
    let formattedNickname = trooperInfo.name;
    
    // Try to set the user's nickname
    try {
      // Check if we can modify the nickname
      const canModifyNickname = 
        member.id !== interaction.guild.ownerId && 
        botMember && 
        member.roles.highest.position < botMember.roles.highest.position;
      
      if (canModifyNickname) {
        // Get the lorename from the API response
        if (trooperInfo.lorename) {
          console.log(`Found lorename: ${trooperInfo.lorename} for trooper: ${trooperInfo.name}`);
          
          // Remove the "212" prefix if it exists
          let cleanLoreName = trooperInfo.lorename.replace(/^212\s*/i, '');
          
          // Process special company cases (case insensitive)
          if (/BARLEX/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 01 Barlex | ${trooperInfo.name}`;
          } else if (/CALE/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 02 Cale | ${trooperInfo.name}`;
          } else if (/REED/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 03 Reed | ${trooperInfo.name}`;
          } else if (/WYLER/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 04 Wyler | ${trooperInfo.name}`;
          } else if (/NOVA/i.test(cleanLoreName)) {
            formattedNickname = `Parjai 05 Nova | ${trooperInfo.name}`;
          } else {
            // For other lorenames, apply proper capitalization
            // Split by spaces and capitalize each word
            const formattedLoreName = cleanLoreName
              .split(' ')
              .map(word => {
                // Skip empty words
                if (!word) return '';
                
                // Capitalize first letter, lowercase the rest
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              })
              .join(' ');
            
            // Add the lorename as a prefix if it's not empty
            if (formattedLoreName.trim() !== '') {
              formattedNickname = `${formattedLoreName} | ${trooperInfo.name}`;
            }
          }
        } else {
          console.log(`No lorename found for trooper: ${trooperInfo.name}, using default name`);
          
          // If no lorename, fall back to company information
          if (trooperInfo.company === '212AB') {
            // No special formatting for 2AB
            formattedNickname = trooperInfo.name;
          }
        }
        
        console.log(`Setting nickname to: ${formattedNickname}`);
        
        // Set the nickname
        await member.setNickname(formattedNickname);
        nicknameSetSuccess = true;
        console.log(`Successfully set nickname for ${discordId} to ${formattedNickname}`);
      } else {
        console.log(`Cannot set nickname for ${discordId} - insufficient permissions`);
      }
    } catch (error) {
      console.error('Error setting nickname:', error);
      // Continue with the registration process even if setting the nickname fails
    }
    
    // For the role assignment part
    try {
      // Prepare roles to add
      const rolesToAdd = [];
      
      // Add 212th role if defined
      if (process.env['212TH_ROLE'] && process.env['212TH_ROLE'].trim() !== '') {
        rolesToAdd.push(process.env['212TH_ROLE']);
      } else {
        // Fallback to hardcoded role ID
        rolesToAdd.push('1332687042756481065');
      }
      
      // Add enlisted role if defined
      if (process.env.ENLISTED_ROLE && process.env.ENLISTED_ROLE.trim() !== '') {
        rolesToAdd.push(process.env.ENLISTED_ROLE);
      } else {
        // Fallback to hardcoded role ID
        rolesToAdd.push('1359286513518645399');
      }
      
      // Check if user is in 212AB based on API information
      const is212AB = trooperInfo.company === '212AB';
      
      // If we determined the user is in 212AB, add the role
      if (is212AB) {
        if (process.env['2AB_ROLE'] && process.env['2AB_ROLE'].trim() !== '') {
          rolesToAdd.push(process.env['2AB_ROLE']);
        } else {
          // Fallback to hardcoded 2AB role ID if needed
          rolesToAdd.push('1359286513518645400'); // Replace with actual 2AB role ID
        }
        console.log(`Adding 2AB role to ${discordId} based on company information`);
      }
      
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
      }
      const rolesToRemove = [];
      rolesToRemove.push(process.env['SHINY_ROLE']);
      rolesToRemove.push(process.env['CADET_ROLE']);
      await member.roles.remove(rolesToRemove);
      // Register the user in the database
      console.log(`Registering user ${discordId} in database with SteamID ${steamId} and officer status ${isTargetOfficer}`);
      const {registerUserInDatabase} = require('../utils/registerUserInDatabase');
      const registrationResult = await registerUserInDatabase(discordId, steamId, isTargetOfficer);

      if (!registrationResult.success) {
        console.error(`Failed to register user in database: ${registrationResult.message}`);
        await interaction.editReply({
          content: `Error: ${registrationResult.message}`,
          ephemeral: true
        });
        return;
      }

      console.log(`Successfully registered user ${discordId} in database`);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `Successfully registered ${targetUser.username}! Their nickname has been set to: ${formattedNickname}${isTargetOfficer ? ' (Officer status recognized)' : ''}${is212AB ? ' (2AB member)' : ''}`
          : `Registration successful! Your nickname has been set to: ${formattedNickname}${isTargetOfficer ? ' (Officer status recognized)' : ''}${is212AB ? ' (2AB member)' : ''}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error assigning roles:', error);
      await interaction.editReply({
        content: isRegisteringOtherUser
          ? `Registration successful, but there was an error assigning roles to ${targetUser.username}. Please contact an administrator. Their trooper name is: ${formattedNickname}`
          : `Registration successful, but there was an error assigning roles. Please contact an administrator. Your trooper name is: ${formattedNickname}`,
        ephemeral: true
      });
    }
  }
};
