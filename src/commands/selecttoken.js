import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('selecttoken')
  .setDescription('Select a token as your active token')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to select').setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const tokenId = interaction.options.getInteger('token_id');
  const discordId = interaction.user.id;

  const tokenRes = await query(
    `SELECT * FROM tokens WHERE id = $1 AND user_discord_id = $2`,
    [tokenId, discordId]
  );
  if (!tokenRes.rows[0]) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Token Not Found',
        description: 'No token found with that ID in your account.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  await query(`UPDATE tokens SET is_selected = FALSE WHERE user_discord_id = $1`, [discordId]);
  await query(`UPDATE tokens SET is_selected = TRUE WHERE id = $1`, [tokenId]);

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '✅ Token Selected',
      description: `**${tokenRes.rows[0].token_name}** (#${tokenId}) is now your active token.`,
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
