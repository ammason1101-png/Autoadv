import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { getOrCreateUser } from '../utils/checkKey.js';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your reseller balance');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const discordId = interaction.user.id;
  const user = await getOrCreateUser(discordId, interaction.user.username);

  if (!user.is_reseller) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Not a Reseller',
        description: 'You are not registered as a reseller. Contact an admin to become one.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '💰 Reseller Balance',
      fields: [
        { name: 'Available Credits', value: `**${user.reseller_balance}** key(s)`, inline: true }
      ],
      description: 'Use `/reseller_gen` to generate keys for your clients.',
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
