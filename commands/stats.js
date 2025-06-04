const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your 212th Attack Battalion statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check stats for (officers only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if the command is being used to look up another user
      const targetUser = interaction.options.getUser('user');
      const isLookingUpOtherUser = targetUser !== null;
      
      // If looking up another user, check if the requester is an officer
      if (isLookingUpOtherUser) {
        const { isUserOfficer } = require('../utils/isUserOfficer');
        const isOfficer = await isUserOfficer(interaction.user.id);
        
        if (!isOfficer) {
          await interaction.editReply({
            content: 'You must be an officer to check stats for other users.',
            ephemeral: true
          });
          return;
        }
      }
      
      // Determine which user to look up
      const userToLookup = isLookingUpOtherUser ? targetUser : interaction.user;
      
      // Get the Discord ID of the user to look up
      const discordId = userToLookup.id;
      
      // Get the SteamID from the Bot database using cache
      console.log(`Getting SteamID for Discord ID: ${discordId}`);
      const {getSteamIdFromDiscordId} = require('../utils/getSteamIdFromDiscordId');
      const steamId = await getSteamIdFromDiscordId(discordId);
      
      if (!steamId) {
        await interaction.editReply({
          content: isLookingUpOtherUser 
            ? `${userToLookup.username} is not registered in our system.` 
            : 'You are not registered in our system. Please use `/register` with your SteamID to register first.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Found SteamID: ${steamId} for Discord ID: ${discordId}`);
      
      // Get the user's information and statistics in one call
      const { getUserInfoAndStatsFromSteamID } = require('../utils/getUserInfoAndStatsFromSteamID');
      const { userInfo, userStats } = await getUserInfoAndStatsFromSteamID(steamId);
      
      if (!userInfo || userInfo.name === 'Unknown') {
        await interaction.editReply({
          content: `Could not find information for ${isLookingUpOtherUser ? userToLookup.username : 'you'} in the 212th database.`,
          ephemeral: true
        });
        return;
      }
      
      // Create an embed with the user's information
      const embed = new EmbedBuilder()
        .setTitle(`212th Attack Battalion - Trooper Stats`)
        .setColor('#FF8C00')
        .setThumbnail('https://i.imgur.com/ushtI24.png')
        .addFields(
          { name: 'Name', value: userInfo.name, inline: true },
          { name: 'Rank', value: userInfo.rank, inline: true },
          { name: 'SteamID', value: steamId, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
      
      // Add statistics fields if they are not 0
      if (userStats) {
        // Add total activities and participations if available
        if (userStats.totalActivities && userStats.totalActivities !== '0') {
          embed.addFields({ name: 'Total Activities', value: userStats.totalActivities, inline: true });
        }
        
        if (userStats.totalParticipations && userStats.totalParticipations !== '0') {
          embed.addFields({ name: 'Total Participations', value: userStats.totalParticipations, inline: true });
        }
        
        // Create a detailed statistics field for non-zero values
        const detailedStats = [];
        
        if (userStats.s1Events && userStats.s1Events !== '0') {
          detailedStats.push(`S1 Events: ${userStats.s1Events}`);
        }
        
        if (userStats.s2Events && userStats.s2Events !== '0') {
          detailedStats.push(`S2 Events: ${userStats.s2Events}`);
        }
        
        if (userStats.trainings && userStats.trainings !== '0') {
          detailedStats.push(`Trainings: ${userStats.trainings}`);
        }
        
        if (userStats.jointTrainings && userStats.jointTrainings !== '0') {
          detailedStats.push(`Joint Trainings: ${userStats.jointTrainings}`);
        }
        
        if (userStats.tryoutsRan && userStats.tryoutsRan !== '0') {
          detailedStats.push(`Tryouts Ran: ${userStats.tryoutsRan}`);
        }
        
        if (userStats.tryoutsOverseen && userStats.tryoutsOverseen !== '0') {
          detailedStats.push(`Tryouts Overseen: ${userStats.tryoutsOverseen}`);
        }
        
        if (userStats.btsRan && userStats.btsRan !== '0') {
          detailedStats.push(`Basic Trainings Ran: ${userStats.btsRan}`);
        }
        
        if (userStats.trainingsLead && userStats.trainingsLead !== '0') {
          detailedStats.push(`Trainings Lead: ${userStats.trainingsLead}`);
        }
        
        if (userStats.rankExams && userStats.rankExams !== '0') {
          detailedStats.push(`Rank Exams: ${userStats.rankExams}`);
        }
        
        // Certifications section
        const certStats = [];
        
        if (userStats.gcCerts && userStats.gcCerts !== '0') {
          certStats.push(`GC Certs: ${userStats.gcCerts}`);
        }
        
        if (userStats.abCerts && userStats.abCerts !== '0') {
          certStats.push(`2AB Certs: ${userStats.abCerts}`);
        }
        
        if (userStats.arfCerts && userStats.arfCerts !== '0') {
          certStats.push(`ARF Certs: ${userStats.arfCerts}`);
        }
        
        if (userStats.wraithCerts && userStats.wraithCerts !== '0') {
          certStats.push(`Wraith Certs: ${userStats.wraithCerts}`);
        }
        
        if (userStats.medicCerts && userStats.medicCerts !== '0') {
          certStats.push(`Medic Certs: ${userStats.medicCerts}`);
        }
        
        if (userStats.heavyCerts && userStats.heavyCerts !== '0') {
          certStats.push(`Heavy Certs: ${userStats.heavyCerts}`);
        }
        
        if (userStats.jsfGoldCerts && userStats.jsfGoldCerts !== '0') {
          certStats.push(`JSF Gold Certs: ${userStats.jsfGoldCerts}`);
        }
        
        // Advanced stats section
        const advancedStats = [];
        
        if (userStats.gmActivities && userStats.gmActivities !== '0') {
          advancedStats.push(`GM Activities: ${userStats.gmActivities}`);
        }
        
        if (userStats.sncoBtsRan && userStats.sncoBtsRan !== '0') {
          advancedStats.push(`(S)NCO BTs Ran: ${userStats.sncoBtsRan}`);
        }
        
        if (userStats.btCertsGiven && userStats.btCertsGiven !== '0') {
          advancedStats.push(`BT Certs Given: ${userStats.btCertsGiven}`);
        }
        
        // Add the detailed stats field if there are any non-zero values
        if (detailedStats.length > 0) {
          embed.addFields({ name: 'Activity Statistics', value: detailedStats.join('\n'), inline: false });
        }
        
        // Add the certification stats field if there are any non-zero values
        if (certStats.length > 0) {
          embed.addFields({ name: 'Certification Statistics', value: certStats.join('\n'), inline: false });
        }
        
        // Add the advanced stats field if there are any non-zero values
        if (advancedStats.length > 0) {
          embed.addFields({ name: 'Advanced Statistics', value: advancedStats.join('\n'), inline: false });
        }
      } else {
        embed.addFields({ name: 'Statistics', value: 'No statistics available yet.', inline: false });
      }
      
      // Send the embed
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing stats command:', error);
      await interaction.editReply({
        content: `An error occurred while retrieving statistics: ${error.message}`,
        ephemeral: true
      });
    }
  }
};