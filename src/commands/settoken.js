import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { maskToken } from '../utils/keys.js';

export const data = new SlashCommandBuilder()
  .setName('settoken')
  .setDescription('Add a Discord token to your account')
  .addStringOption(opt =>
    opt.setName('token').setDescription('The Discord token to add').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('name').setDescription('A nickname for this token').setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const token = interaction.options.getString('token').trim();
  const name = interaction.options.getString('name') || `Token ${Date.now()}`;
  const discordId = interaction.user.id;

  const existing = await query(
    `SELECT id FROM tokens WHERE user_discord_id = $1 AND token_value = $2`,
    [discordId, token]
  );
  if (existing.rows[0]) {
    return interaction.editReply({
      embeds: [{
        color: 0xFEE75C,
        title: '⚠️ Token Already Added',
        description: 'You already have this token in your account.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  const ins = await query(
    `INSERT INTO tokens (user_discord_id, token_value, token_name) VALUES ($1, $2, $3) RETURNING id`,
    [discordId, token, name]
  );

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '✅ Token Added',
      fields: [
        { name: 'Name', value: name, inline: true },
        { name: 'Token ID', value: `#${ins.rows[0].id}`, inline: true },
        { name: 'Token', value: `\`${maskToken(token)}\``, inline: true }
      ],
      footer: { text: 'AutoAdv Bot • Use /selecttoken to activate it' }
    }]
  });
}
