const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const reminderSchema = require('../../Schemas.js/remindSchema');

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`remind`)
    .setDescription(`Set a reminder for yorself`)
    .addSubcommand(command => command.setName('set').setDescription('Set a remindet').addStringOption(option => option.setName('reminder').setDescription('What do you want to be reminded of').setRequired(true)).addIntegerOption(option => option.setName('minutes').setDescription('How many minutes from now').setRequired(true).setMinValue(0).setMaxValue(59)).addIntegerOption(option => option.setName('hours').setDescription('How many hours from now').setRequired(false).setMinValue(0).setMaxValue(23))),
    async execute (interaction) {

        const { options, guild } = interaction;
        const reminder = options.getString('reminder');
        const minute = options.getInteger('minutes') || 0;
        const hour = options.getInteger('hours') || 0;

        let time = Date.now() + (hour * 1000 * 60 * 60) + (minute * 1000 * 60);

        await reminderSchema.create({
            User: interaction.user.id,
            Time: time,
            Remind: reminder
        });

        const embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`Your reminder has been set for <t:${Math.floor(time/1000)}:R>! I will remind you "${reminder}"`)

        await interaction.reply({ embeds: [embed], ephemeral: true});

    }
}
