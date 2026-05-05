import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { getOrCreateUser } from '../utils/checkKey.js';

export const data = new SlashCommandBuilder()
  .setName('redeem_key')
  .setDescription('Redeem a license key to activate your account')
  .addStringOption(opt =>
    opt.setName('key').setDescription('Your license key').setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const keyValue = interaction.options.getString('key').trim().toUpperCase();
  const discordId = interaction.user.id;
  const username = interaction.user.username;

  const keyRes = await query(
    `SELECT * FROM license_keys WHERE key_value = $1 AND is_active = TRUE`,
    [keyValue]
  );
  const key = keyRes.rows[0];

  if (!key) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Invalid Key',
        description: 'That key does not exist or is no longer active.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  if (key.used_by && key.used_by !== discordId) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Key Already Used',
        description: 'This key has already been redeemed by another user.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  const user = await getOrCreateUser(discordId, username);
  const expiresAt = new Date(Date.now() + key.duration_days * 86400000);

  await query(
    `UPDATE license_keys SET used_by = $1, used_at = NOW(), expires_at = $2 WHERE id = $3`,
    [discordId, expiresAt, key.id]
  );
  await query(
    `UPDATE users SET key_id = $1, username = $2 WHERE discord_id = $3`,
    [key.id, username, discordId]
  );

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '✅ Key Redeemed!',
      description: `Your **${key.type}** license has been activated.`,
      fields: [
        { name: 'Duration', value: `${key.duration_days} days`, inline: true },
        { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
        { name: 'Type', value: key.type.charAt(0).toUpperCase() + key.type.slice(1), inline: true }
      ],
      footer: { text: 'AutoAdv Bot • Use /help to see all commands' }
    }]
  });
}
