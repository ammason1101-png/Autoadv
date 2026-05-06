import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { maskToken, formatExpiry, parseChannelIds } from '../utils/keys.js';
import { isJobRunning, startAdJob, stopAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('Full token management dashboard');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;
  await sendDashboard(interaction, interaction.user.id, user, false);
}

async function buildDashboardEmbed(discordId, user) {
  const tokensRes = await query(
    `SELECT t.*,
      (SELECT COUNT(*) FROM ad_jobs aj WHERE aj.token_id = t.id AND aj.is_running = TRUE) as running_jobs,
      (SELECT COUNT(*) FROM ad_jobs aj WHERE aj.token_id = t.id) as total_jobs
     FROM tokens t WHERE t.user_discord_id = $1 ORDER BY t.id`,
    [discordId]
  );
  const tokens = tokensRes.rows;
  const totalRunning = tokens.reduce((a, t) => a + parseInt(t.running_jobs), 0);
  const totalJobs = tokens.reduce((a, t) => a + parseInt(t.total_jobs), 0);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎛️ Token Dashboard')
    .setDescription(tokens.length === 0
      ? '> No tokens added yet. Use `/ad` to add one and start a campaign.'
      : '> Select a token below to configure it, edit ad jobs, and more.')
    .addFields({
      name: '📊 Overview',
      value: `**Tokens:** ${tokens.length}  ·  **Total Jobs:** ${totalJobs}  ·  **Running:** 🟢 ${totalRunning}  ·  **License:** ${user.type || 'basic'} — ${formatExpiry(user.expires_at)}`,
      inline: false
    });

  if (tokens.length > 0) {
    const tokenList = tokens.map(t => {
      const running = parseInt(t.running_jobs);
      const total = parseInt(t.total_jobs);
      return [
        `${running > 0 ? '🟢' : '🔴'} **#${t.id} — ${t.token_name}**${t.is_selected ? ' ⭐' : ''}`,
        `\`${maskToken(t.token_value)}\` · Jobs: **${running}/${total}** running · Reply: ${t.auto_reply_enabled ? '✅' : '❌'} · Bypass: ${t.bypass_enabled ? '✅' : '❌'}`
      ].join('\n');
    }).join('\n\n');
    embed.addFields({ name: `🔑 Your Tokens (${tokens.length})`, value: tokenList.slice(0, 1024) });
  }

  embed.setFooter({ text: 'AutoAdv Bot • Dashboard' }).setTimestamp();
  return { embed, tokens };
}

function buildDashboardComponents(tokens) {
  const rows = [];
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_startall').setLabel('▶ Start All').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('dash_stopall').setLabel('⏹ Stop All').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dash_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
  ));
  if (tokens.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_select_token')
        .setPlaceholder('⚙️ Pick a token to manage...')
        .addOptions(tokens.slice(0, 25).map(t => ({
          label: `#${t.id} — ${t.token_name}`.slice(0, 100),
          description: `${maskToken(t.token_value)} · ${t.running_jobs} running`.slice(0, 100),
          value: String(t.id),
          emoji: parseInt(t.running_jobs) > 0 ? '🟢' : '🔴'
        })))
    ));
  }
  return rows;
}

async function sendDashboard(interaction, discordId, user, isUpdate) {
  const { embed, tokens } = await buildDashboardEmbed(discordId, user);
  return interaction.editReply({ embeds: [embed], components: buildDashboardComponents(tokens) });
}

async function sendTokenDetail(interaction, discordId, tokenId) {
  const res = await query(
    `SELECT t.*,
      (SELECT COUNT(*) FROM ad_jobs aj WHERE aj.token_id = t.id AND aj.is_running = TRUE) as running_jobs,
      (SELECT COUNT(*) FROM ad_jobs aj WHERE aj.token_id = t.id) as total_jobs
     FROM tokens t WHERE t.id = $1 AND t.user_discord_id = $2`,
    [tokenId, discordId]
  );
  const t = res.rows[0];
  if (!t) return;

  const jobsRes = await query(`SELECT * FROM ad_jobs WHERE token_id = $1 ORDER BY id`, [tokenId]);
  const jobs = jobsRes.rows;

  const jobList = jobs.length
    ? jobs.map(j => {
        const channels = j.channel_ids || [];
        const images = j.images || [];
        const msg = j.message.length > 60 ? j.message.slice(0, 60) + '…' : j.message;
        return `**#${j.id}** ${isJobRunning(j.id) ? '🟢' : '🔴'} · ${channels.length} ch · ${j.delay_seconds}s · ${images.length} img\n> ${msg}`;
      }).join('\n\n')
    : 'No ad jobs yet. Click **➕ New Ad Job** to create one.';

  const embed = new EmbedBuilder()
    .setColor(parseInt(t.running_jobs) > 0 ? 0x57F287 : 0x5865F2)
    .setTitle(`⚙️ Token #${t.id} — ${t.token_name}`)
    .addFields(
      { name: 'Token', value: `\`${maskToken(t.token_value)}\``, inline: true },
      { name: 'Selected', value: t.is_selected ? '⭐ Yes' : '— No', inline: true },
      { name: 'Auto-Reply', value: t.auto_reply_enabled ? '✅ On' : '❌ Off', inline: true },
      { name: 'Bypass', value: t.bypass_enabled ? '✅ On' : '❌ Off', inline: true },
      { name: 'Running Jobs', value: `${t.running_jobs} / ${t.total_jobs}`, inline: true },
      { name: `📋 Ad Jobs (${jobs.length})`, value: jobList.slice(0, 1024) }
    )
    .setFooter({ text: 'AutoAdv Bot • Token Detail' })
    .setTimestamp();

  const rows = [];

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dash_tok_start_${tokenId}`).setLabel('▶ Start').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`dash_tok_stop_${tokenId}`).setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`dash_tok_reply_${tokenId}`).setLabel(t.auto_reply_enabled ? '🔕 Reply Off' : '🔔 Reply On').setStyle(t.auto_reply_enabled ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dash_tok_bypass_${tokenId}`).setLabel(t.bypass_enabled ? '🚫 Bypass Off' : '✅ Bypass On').setStyle(t.bypass_enabled ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dash_tok_select_${tokenId}`).setLabel('⭐ Set Active').setStyle(ButtonStyle.Primary)
  ));

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dash_tok_newjob_${tokenId}`).setLabel('➕ New Ad Job').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`dash_tok_remove_${tokenId}`).setLabel('🗑️ Remove Token').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dash_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
  ));

  if (jobs.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`dash_select_job_${tokenId}`)
        .setPlaceholder('✏️ Select a job to edit or delete...')
        .addOptions(jobs.slice(0, 25).map(j => {
          const channels = j.channel_ids || [];
          const msg = j.message.length > 50 ? j.message.slice(0, 50) + '…' : j.message;
          return {
            label: `Job #${j.id} — ${channels.length} channels · ${j.delay_seconds}s`.slice(0, 100),
            description: msg.slice(0, 100),
            value: String(j.id),
            emoji: isJobRunning(j.id) ? '🟢' : '🔴'
          };
        }))
    ));
  }

  return interaction.editReply({ embeds: [embed], components: rows });
}

async function sendJobDetail(interaction, discordId, jobId, tokenId) {
  const jobRes = await query(`SELECT * FROM ad_jobs WHERE id = $1 AND user_discord_id = $2`, [jobId, discordId]);
  const j = jobRes.rows[0];
  if (!j) return;

  const channels = j.channel_ids || [];
  const images = j.images || [];
  const running = isJobRunning(jobId);

  const embed = new EmbedBuilder()
    .setColor(running ? 0x57F287 : 0xED4245)
    .setTitle(`📋 Ad Job #${j.id} — ${running ? '🟢 Running' : '🔴 Stopped'}`)
    .addFields(
      { name: '💬 Message', value: j.message.length > 500 ? j.message.slice(0, 500) + '…' : j.message },
      { name: '📡 Channels', value: channels.map(c => `<#${c}>`).join(' ') || channels.join(', ') || 'None', inline: true },
      { name: '⏱️ Delay', value: `${j.delay_seconds}s per cycle`, inline: true },
      { name: '🖼️ Images', value: `${images.length} attached`, inline: true },
      { name: '🔄 Last Cycle', value: j.last_cycle_at ? `<t:${Math.floor(new Date(j.last_cycle_at).getTime() / 1000)}:R>` : 'Not started yet', inline: true }
    )
    .setFooter({ text: 'AutoAdv Bot • Job Detail' })
    .setTimestamp();

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dash_job_edit_${jobId}_${tokenId}`).setLabel('✏️ Edit Job').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`dash_job_toggle_${jobId}_${tokenId}`).setLabel(running ? '⏹ Stop Job' : '▶ Start Job').setStyle(running ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`dash_job_delete_${jobId}_${tokenId}`).setLabel('🗑️ Delete Job').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`dash_tok_back_${tokenId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
    )
  ];

  return interaction.editReply({ embeds: [embed], components: rows });
}

function buildJobModal(tokenId, jobId, existing) {
  const modal = new ModalBuilder()
    .setCustomId(jobId ? `dash_modal_editjob_${jobId}_${tokenId}` : `dash_modal_newjob_${tokenId}`)
    .setTitle(jobId ? '✏️ Edit Ad Job' : '➕ New Ad Job');

  const messageInput = new TextInputBuilder()
    .setCustomId('modal_message')
    .setLabel('Message')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('The message to send in all channels...')
    .setRequired(true)
    .setMaxLength(2000);
  if (existing?.message) messageInput.setValue(existing.message);

  const channelsInput = new TextInputBuilder()
    .setCustomId('modal_channels')
    .setLabel('Channel IDs (space or comma separated)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('123456789 987654321 or 123,456,789')
    .setRequired(true)
    .setMaxLength(1000);
  if (existing?.channel_ids) channelsInput.setValue((existing.channel_ids).join(' '));

  const delayInput = new TextInputBuilder()
    .setCustomId('modal_delay')
    .setLabel('Delay (seconds between cycles)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('60')
    .setRequired(false)
    .setMaxLength(6);
  if (existing?.delay_seconds) delayInput.setValue(String(existing.delay_seconds));

  const imagesInput = new TextInputBuilder()
    .setCustomId('modal_images')
    .setLabel('Image URLs (optional, space/comma separated)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://i.imgur.com/xxx.png https://...')
    .setRequired(false)
    .setMaxLength(2000);
  if (existing?.images?.length) imagesInput.setValue((existing.images).join(' '));

  modal.addComponents(
    new ActionRowBuilder().addComponents(messageInput),
    new ActionRowBuilder().addComponents(channelsInput),
    new ActionRowBuilder().addComponents(delayInput),
    new ActionRowBuilder().addComponents(imagesInput)
  );
  return modal;
}

export async function handleInteraction(interaction) {
  const discordId = interaction.user.id;
  const userRes = await query(
    `SELECT u.*, lk.expires_at, lk.type FROM users u LEFT JOIN license_keys lk ON lk.id = u.key_id WHERE u.discord_id = $1`,
    [discordId]
  );
  const user = userRes.rows[0];
  if (!user) return;

  if (interaction.isModalSubmit()) {
    return handleModal(interaction, discordId, user);
  }

  if (interaction.isStringSelectMenu()) {
    await interaction.deferUpdate();
    const id = interaction.customId;
    if (id === 'dash_select_token') {
      return sendTokenDetail(interaction, discordId, parseInt(interaction.values[0]));
    }
    if (id.startsWith('dash_select_job_')) {
      const tokenId = parseInt(id.split('_')[3]);
      return sendJobDetail(interaction, discordId, parseInt(interaction.values[0]), tokenId);
    }
    return;
  }

  if (!interaction.isButton()) return;

  const id = interaction.customId;

  if (id.startsWith('dash_tok_newjob_')) {
    const tokenId = parseInt(id.split('_')[3]);
    return interaction.showModal(buildJobModal(tokenId, null, null));
  }

  if (id.startsWith('dash_job_edit_')) {
    const parts = id.split('_');
    const jobId = parseInt(parts[3]);
    const tokenId = parseInt(parts[4]);
    const jobRes = await query(`SELECT * FROM ad_jobs WHERE id = $1`, [jobId]);
    const existing = jobRes.rows[0];
    return interaction.showModal(buildJobModal(tokenId, jobId, existing));
  }

  await interaction.deferUpdate();

  if (id === 'dash_refresh' || id === 'dash_back') {
    return sendDashboard(interaction, discordId, user, true);
  }

  if (id.startsWith('dash_tok_back_')) {
    const tokenId = parseInt(id.split('_')[3]);
    return sendTokenDetail(interaction, discordId, tokenId);
  }

  if (id === 'dash_startall') {
    const jobs = await query(`SELECT id FROM ad_jobs WHERE user_discord_id = $1 AND is_running = FALSE`, [discordId]);
    for (const j of jobs.rows) {
      await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [j.id]);
      await startAdJob(j.id, interaction.client);
    }
    return sendDashboard(interaction, discordId, user, true);
  }

  if (id === 'dash_stopall') {
    const jobs = await query(`SELECT id FROM ad_jobs WHERE user_discord_id = $1`, [discordId]);
    for (const j of jobs.rows) await stopAdJob(j.id);
    return sendDashboard(interaction, discordId, user, true);
  }

  if (id.startsWith('dash_tok_')) {
    const parts = id.split('_');
    const action = parts[2];
    const tokenId = parseInt(parts[3]);

    if (action === 'start') {
      const jobs = await query(`SELECT id FROM ad_jobs WHERE token_id = $1 AND is_running = FALSE`, [tokenId]);
      for (const j of jobs.rows) {
        await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [j.id]);
        await startAdJob(j.id, interaction.client);
      }
      return sendTokenDetail(interaction, discordId, tokenId);
    }
    if (action === 'stop') {
      const jobs = await query(`SELECT id FROM ad_jobs WHERE token_id = $1`, [tokenId]);
      for (const j of jobs.rows) await stopAdJob(j.id);
      return sendTokenDetail(interaction, discordId, tokenId);
    }
    if (action === 'reply') {
      const t = await query(`SELECT auto_reply_enabled FROM tokens WHERE id = $1`, [tokenId]);
      await query(`UPDATE tokens SET auto_reply_enabled = $1 WHERE id = $2`, [!t.rows[0].auto_reply_enabled, tokenId]);
      return sendTokenDetail(interaction, discordId, tokenId);
    }
    if (action === 'bypass') {
      const t = await query(`SELECT bypass_enabled FROM tokens WHERE id = $1`, [tokenId]);
      await query(`UPDATE tokens SET bypass_enabled = $1 WHERE id = $2`, [!t.rows[0].bypass_enabled, tokenId]);
      return sendTokenDetail(interaction, discordId, tokenId);
    }
    if (action === 'select') {
      await query(`UPDATE tokens SET is_selected = FALSE WHERE user_discord_id = $1`, [discordId]);
      await query(`UPDATE tokens SET is_selected = TRUE WHERE id = $1`, [tokenId]);
      return sendTokenDetail(interaction, discordId, tokenId);
    }
    if (action === 'remove') {
      await query(`DELETE FROM tokens WHERE id = $1 AND user_discord_id = $2`, [tokenId, discordId]);
      return sendDashboard(interaction, discordId, user, true);
    }
  }

  if (id.startsWith('dash_job_')) {
    const parts = id.split('_');
    const action = parts[2];
    const jobId = parseInt(parts[3]);
    const tokenId = parseInt(parts[4]);

    if (action === 'toggle') {
      if (isJobRunning(jobId)) {
        await stopAdJob(jobId);
      } else {
        await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [jobId]);
        await startAdJob(jobId, interaction.client);
      }
      return sendJobDetail(interaction, discordId, jobId, tokenId);
    }
    if (action === 'delete') {
      await stopAdJob(jobId);
      await query(`DELETE FROM ad_jobs WHERE id = $1 AND user_discord_id = $2`, [jobId, discordId]);
      return sendTokenDetail(interaction, discordId, tokenId);
    }
  }
}

async function handleModal(interaction, discordId, user) {
  await interaction.deferUpdate();
  const id = interaction.customId;
  const message = interaction.fields.getTextInputValue('modal_message');
  const channelInput = interaction.fields.getTextInputValue('modal_channels');
  const delayRaw = interaction.fields.getTextInputValue('modal_delay');
  const imagesRaw = interaction.fields.getTextInputValue('modal_images');

  const channelIds = parseChannelIds(channelInput);
  const delay = parseInt(delayRaw) > 0 ? parseInt(delayRaw) : 60;
  const images = imagesRaw
    ? imagesRaw.split(/[\s,]+/).map(u => u.trim()).filter(u => u.startsWith('http'))
    : [];

  if (id.startsWith('dash_modal_newjob_')) {
    const tokenId = parseInt(id.split('_')[3]);
    const tokenRes = await query(`SELECT * FROM tokens WHERE id = $1 AND user_discord_id = $2`, [tokenId, discordId]);
    if (!tokenRes.rows[0]) return;

    const jobRes = await query(
      `INSERT INTO ad_jobs (token_id, user_discord_id, message, channel_ids, delay_seconds, images, is_running)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
      [tokenId, discordId, message, JSON.stringify(channelIds), delay, JSON.stringify(images)]
    );
    await startAdJob(jobRes.rows[0].id, interaction.client);
    return sendTokenDetail(interaction, discordId, tokenId);
  }

  if (id.startsWith('dash_modal_editjob_')) {
    const parts = id.split('_');
    const jobId = parseInt(parts[3]);
    const tokenId = parseInt(parts[4]);

    const wasRunning = isJobRunning(jobId);
    if (wasRunning) await stopAdJob(jobId);

    await query(
      `UPDATE ad_jobs SET message = $1, channel_ids = $2, delay_seconds = $3, images = $4, is_running = $5 WHERE id = $6 AND user_discord_id = $7`,
      [message, JSON.stringify(channelIds), delay, JSON.stringify(images), wasRunning, jobId, discordId]
    );

    if (wasRunning) await startAdJob(jobId, interaction.client);
    return sendJobDetail(interaction, discordId, jobId, tokenId);
  }
}
