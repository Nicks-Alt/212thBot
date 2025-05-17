const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display your avatar or the avatar of another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose avatar you want to see')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Get the target user (either the mentioned user or the command user)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get avatar URL with size 1024
      const avatarUrl = targetUser.displayAvatarURL({ size: 1024, dynamic: true });
      
      // Create an embed with the avatar
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Avatar`)
        .setColor(0x3498db)
        .setImage(avatarUrl)
        .setDescription(`[Avatar URL](${avatarUrl})`)
        .setFooter({ text: `Requested by ${interaction.user.username}` })
        .setTimestamp();
      
      // Send the embed
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in avatar command:', error);
      await interaction.reply({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    }
  },
};