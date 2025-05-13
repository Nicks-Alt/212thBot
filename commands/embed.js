const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create a customized embed message')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title of the embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('The description of the embed (use \\n for new lines)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('The color of the embed (hex code like #FF0000)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('image')
                .setDescription('URL of the image to display')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('header_text')
                .setDescription('Text to display in the header/author section')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('header_image')
                .setDescription('URL of the header image to display at the top of the embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('thumbnail')
                .setDescription('URL of the thumbnail to display')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('footer')
                .setDescription('Footer text for the embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('footer_image')
                .setDescription('URL of the footer image')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field1_name')
                .setDescription('Name for field 1')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field1_value')
                .setDescription('Value for field 1 (use \\n for new lines)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('field1_inline')
                .setDescription('Should field 1 be inline?')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field2_name')
                .setDescription('Name for field 2')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field2_value')
                .setDescription('Value for field 2 (use \\n for new lines)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('field2_inline')
                .setDescription('Should field 2 be inline?')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field3_name')
                .setDescription('Name for field 3')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field3_value')
                .setDescription('Value for field 3 (use \\n for new lines)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('field3_inline')
                .setDescription('Should field 3 be inline?')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field4_name')
                .setDescription('Name for field 4')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field4_value')
                .setDescription('Value for field 4 (use \\n for new lines)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('field4_inline')
                .setDescription('Should field 4 be inline?')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field5_name')
                .setDescription('Name for field 5')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('field5_value')
                .setDescription('Value for field 5 (use \\n for new lines)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('field5_inline')
                .setDescription('Should field 5 be inline?')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('timestamp')
                .setDescription('Include current timestamp?')
                .setRequired(false)),
                
    async execute(interaction) {
        // The interaction is already deferred in index.js
        
        try {
            // Get basic options from the command
            const title = interaction.options.getString('title');
            let description = interaction.options.getString('description');
            const color = interaction.options.getString('color');
            const imageUrl = interaction.options.getString('image');
            const headerText = interaction.options.getString('header_text');
            const headerImageUrl = interaction.options.getString('header_image');
            const thumbnailUrl = interaction.options.getString('thumbnail');
            const footer = interaction.options.getString('footer');
            const footerImageUrl = interaction.options.getString('footer_image');
            const includeTimestamp = interaction.options.getBoolean('timestamp') ?? false;
            
            // Default values
            const defaultHeaderText = "212th Attack Battalion";
            const defaultHeaderImage = "https://images-ext-1.discordapp.net/external/M6J5nBNv1fqh7byVIHYR0gnOtTj4CPoSzARV3SMiK1s/https/images-ext-1.discordapp.net/external/PzTY93BIRblNJkgdcxO39n5zCuUxyr2EZRrjXRbvY0E/https/cdn.discordapp.com/emojis/755600680651325490.webp";
            const defaultFooterText = "212th Attack Battalion";
            const defaultFooterImage = defaultHeaderImage;
            const defaultThumbnail = "https://i.imgur.com/ushtI24.png";
            const defaultColor = "#FF8C00";
            
            // Process newlines in description
            if (description) {
                description = description.replace(/\\n/g, '\n');
            }
            
            // Create the embed with the provided options
            const embed = new EmbedBuilder();
            
            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            
            // Set color (use default if not specified)
            if (color) {
                try {
                    embed.setColor(color);
                } catch (error) {
                    embed.setColor(defaultColor);
                }
            } else {
                embed.setColor(defaultColor);
            }
            
            // Add header (author) - check text and image individually
            const finalHeaderText = headerText || defaultHeaderText;
            const finalHeaderImage = headerImageUrl || defaultHeaderImage;
            embed.setAuthor({ 
                name: finalHeaderText,
                iconURL: finalHeaderImage
            });
            
            if (imageUrl) embed.setImage(imageUrl);
            
            // Set thumbnail (use default if not specified)
            embed.setThumbnail(thumbnailUrl || defaultThumbnail);
            
            // Set footer - check text and image individually
            const finalFooterText = footer || defaultFooterText;
            const finalFooterImage = footerImageUrl || defaultFooterImage;
            embed.setFooter({ 
                text: finalFooterText,
                iconURL: finalFooterImage
            });
            
            if (includeTimestamp) embed.setTimestamp();
            
            // Add fields if provided
            let hasFields = false;
            for (let i = 1; i <= 5; i++) {
                const fieldName = interaction.options.getString(`field${i}_name`);
                let fieldValue = interaction.options.getString(`field${i}_value`);
                const fieldInline = interaction.options.getBoolean(`field${i}_inline`) ?? false;
                
                if (fieldName && fieldValue) {
                    // Process newlines in field values
                    fieldValue = fieldValue.replace(/\\n/g, '\n');
                    embed.addFields({ name: fieldName, value: fieldValue, inline: fieldInline });
                    hasFields = true;
                }
            }
            
            // Check if the embed has at least one required field
            const hasRequiredFields = title || description || hasFields || imageUrl;
            
            if (!hasRequiredFields) {
                await interaction.editReply({
                    content: 'Error: Your embed must include at least one of the following: title, description, field, or image.',
                    ephemeral: true
                });
                return;
            }
            
            // Send the embed to the channel
            await interaction.channel.send({ embeds: [embed] });
            
            // Edit the deferred reply
            await interaction.editReply({ 
                content: 'Embed sent successfully!', 
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Error sending embed:', error);
            await interaction.editReply({
                content: `Error sending embed: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
