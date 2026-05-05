import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('oauth_link')
  .setDescription('Get the bot invite / OAuth2 link');

export async function execute(interaction) {
  const clientId = interaction.client.user.id;
  const link = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=8`;
  return interaction.reply({
    embeds: [{
      color: 0x5865F2,
      title: '🔗 OAuth2 / Invite Link',
      description: `[Click here to invite AutoAdv Bot](${link})`,
      footer: { text: 'AutoAdv Bot' }
    }],
    ephemeral: true
  });
}
