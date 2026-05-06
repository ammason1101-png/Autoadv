import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { formatExpiry, maskToken } from '../utils/keys.js';
import { isJobRunning, startAdJob, stopAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('configpanel')
  .setDescription('Open the interactive configuration panel');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  await sendPanel(interaction, user, false);
}

async function sendPanel(interaction, user, isUpdate) {
  const discordId = user.discord_id || interaction.user.id;
  const tokensRes = await query(`SELECT * FROM tokens WHERE user_discord_id = $1`, [discordId]);
  const jobsRes = await query(`SELECT * FROM ad_jobs WHERE user_discord_id = $1`, [discordId]);
  const runningJobs = jobsRes.rows.filter(j => isJobRunning(j.id));
  const stoppedJobs = jobsRes.rows.filter(j => !isJobRunning(j.id));

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ Config Panel')
    .setDescription('Manage your tokens and ad campaigns.')
    .addFields(
      { name: '📋 Account', value: `License: **${user.type || 'basic'}** — Expires: ${formatExpiry(user.expires_at)}`, inline: false },
      { name: '🔑 Tokens', value: tokensRes.rows.length ? tokensRes.rows.map(t => `${t.is_selected ? '🟢' : '⚫'} #${t.id} — ${t.token_name} | Reply:${t.auto_reply_enabled ? '✅' : '❌'} Bypass:${t.bypass_enabled ? '✅' : '❌'}`).join('\n') : 'No tokens added.', inline: false },
      { name: '📢 Jobs', value: `🟢 Running: ${runningJobs.length} | 🔴 Stopped: ${stoppedJobs.length}`, inline: false }
    )
    .setFooter({ text: 'AutoAdv Bot • Panel' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_startall').setLabel('▶ Start All').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('panel_stopall').setLabel('⏹ Stop All').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('panel_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('panel_listtokens').setLabel('📋 List Tokens').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_status').setLabel('📊 Status').setStyle(ButtonStyle.Primary)
  );

  const fn = isUpdate ? interaction.editReply.bind(interaction) : interaction.editReply.bind(interaction);
  return fn({ embeds: [embed], components: [row1] });
}

export async function handleButton(interaction) {
  await interaction.deferUpdate();
  const discordId = interaction.user.id;
  const userRes = await query(
    `SELECT u.*, lk.expires_at, lk.type FROM users u LEFT JOIN license_keys lk ON lk.id = u.key_id WHERE u.discord_id = $1`,
    [discordId]
  );
  const user = userRes.rows[0];
  if (!user) return;

  const id = interaction.customId;

  if (id === 'panel_startall') {
    const jobs = await query(`SELECT id FROM ad_jobs WHERE user_discord_id = $1 AND is_running = FALSE`, [discordId]);
    for (const j of jobs.rows) {
      await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [j.id]);
      await startAdJob(j.id, interaction.client);
    }
  } else if (id === 'panel_stopall') {
    const jobs = await query(`SELECT id FROM ad_jobs WHERE user_discord_id = $1`, [discordId]);
    for (const j of jobs.rows) await stopAdJob(j.id);
  }

  await sendPanel(interaction, { ...user, discord_id: discordId }, true);
}
