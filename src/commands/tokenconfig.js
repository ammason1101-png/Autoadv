import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('tokenconfig')
  .setDescription('Configure settings for a token')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to configure').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('name').setDescription('New nickname for this token').setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName('auto_reply').setDescription('Enable/disable auto-reply').setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName('bypass').setDescription('Enable/disable bypass mode').setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const tokenId = interaction.options.getInteger('token_id');
  const discordId = interaction.user.id;
  const newName = interaction.options.getString('name');
  const autoReply = interaction.options.getBoolean('auto_reply');
  const bypass = interaction.options.getBoolean('bypass');

  const tokenRes = await query(
    `SELECT * FROM tokens WHERE id = $1 AND user_discord_id = $2`,
    [tokenId, discordId]
  );
  if (!tokenRes.rows[0]) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Token Not Found', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  const updates = [];
  const values = [];
  let i = 1;
  if (newName !== null) { updates.push(`token_name = $${i++}`); values.push(newName); }
  if (autoReply !== null) { updates.push(`auto_reply_enabled = $${i++}`); values.push(autoReply); }
  if (bypass !== null) { updates.push(`bypass_enabled = $${i++}`); values.push(bypass); }

  if (!updates.length) {
    return interaction.editReply({
      embeds: [{ color: 0xFEE75C, title: '⚠️ Nothing to Update', description: 'Please provide at least one option to change.', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  values.push(tokenId);
  await query(`UPDATE tokens SET ${updates.join(', ')} WHERE id = $${i}`, values);

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '✅ Token Updated',
      description: `Token #${tokenId} configuration updated.`,
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
