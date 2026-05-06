import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('togglepanel')
  .setDescription('Toggle auto-reply and bypass settings for a token')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to toggle').setRequired(true)
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
  const token = tokenRes.rows[0];
  if (!token) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Token Not Found', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  await sendTogglePanel(interaction, token, false);
}

async function sendTogglePanel(interaction, token, update) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🔧 Toggle Panel — #${token.id} ${token.token_name}`)
    .addFields(
      { name: 'Auto-Reply', value: token.auto_reply_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Bypass', value: token.bypass_enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
    )
    .setFooter({ text: 'AutoAdv Bot' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`toggle_reply_${token.id}`)
      .setLabel(token.auto_reply_enabled ? '🔴 Disable Auto-Reply' : '🟢 Enable Auto-Reply')
      .setStyle(token.auto_reply_enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`toggle_bypass_${token.id}`)
      .setLabel(token.bypass_enabled ? '🔴 Disable Bypass' : '🟢 Enable Bypass')
      .setStyle(token.bypass_enabled ? ButtonStyle.Danger : ButtonStyle.Success)
  );

  const fn = update ? interaction.editReply.bind(interaction) : interaction.editReply.bind(interaction);
  return fn({ embeds: [embed], components: [row] });
}

export async function handleButton(interaction) {
  await interaction.deferUpdate();
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const tokenId = parseInt(parts[2]);
  const discordId = interaction.user.id;

  const tokenRes = await query(
    `SELECT * FROM tokens WHERE id = $1 AND user_discord_id = $2`,
    [tokenId, discordId]
  );
  const token = tokenRes.rows[0];
  if (!token) return;

  if (action === 'reply') {
    await query(`UPDATE tokens SET auto_reply_enabled = $1 WHERE id = $2`, [!token.auto_reply_enabled, tokenId]);
    token.auto_reply_enabled = !token.auto_reply_enabled;
  } else if (action === 'bypass') {
    await query(`UPDATE tokens SET bypass_enabled = $1 WHERE id = $2`, [!token.bypass_enabled, tokenId]);
    token.bypass_enabled = !token.bypass_enabled;
  }

  await sendTogglePanel(interaction, token, true);
}
