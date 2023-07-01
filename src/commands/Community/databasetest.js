const { SlashCommandBuilder } = require(`@discordjs/builders`);
const testSchema = require('../../Schemas.js/test');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('dbtest')
    .setDescription('db test'),
    async execute (interaction) {

      testSchema.findOne({ GuildID: interaction.guild.id, UserID: interaction.user.id}, async (err, data) => {
        if (err) throw err;

        if (!data) {
          testSchema.create({
            GuildID: interaction.guild.id,
            UserID: interaction.user.id
          })
        }

        if (data) {

          const user = data.UserID;
          const guild = data.GuildID;

          console.log({ user, guild})
        }
      })

    } 
}