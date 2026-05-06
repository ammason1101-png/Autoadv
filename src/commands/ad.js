import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { parseChannelIds, maskToken } from '../utils/keys.js';
import { startAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('ad')
  .setDescription('All-in-one: set up and start an ad campaign')
  .addStringOption(opt =>
    opt.setName('token').setDescription('Account token to send ads with').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('message').setDescription('Message to send in all channels').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('channel_ids').setDescription('Channel IDs or mentions (space/comma separated)').setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('delay').setDescription('Seconds between each full cycle (default: 60)').setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('name').setDescription('Nickname for this token (if new)').setRequired(false)
  )
  .addAttachmentOption(opt => opt.setName('image1').setDescription('Image 1').setRequired(false))
  .addAttachmentOption(opt => opt.setName('image2').setDescription('Image 2').setRequired(false))
  .addAttachmentOption(opt => opt.setName('image3').setDescription('Image 3').setRequired(false))
  .addAttachmentOption(opt => opt.setName('image4').setDescription('Image 4').setRequired(false))
  .addAttachmentOption(opt => opt.setName('image5').setDescription('Image 5').setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const tokenValue = interaction.options.getString('token').trim();
  const message = interaction.options.getString('message');
  const channelInput = interaction.options.getString('channel_ids');
  const delay = interaction.options.getInteger('delay') || 60;
  const tokenName = interaction.options.getString('name') || `Token ${maskToken(tokenValue)}`;
  const discordId = interaction.user.id;

  const channelIds = parseChannelIds(channelInput);
  if (!channelIds.length) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Invalid Channels', description: 'Could not parse any valid channel IDs.', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  let tokenRes = await query(
    `SELECT * FROM tokens WHERE user_discord_id = $1 AND token_value = $2`,
    [discordId, tokenValue]
  );
  let token = tokenRes.rows[0];
  let isNew = false;

  if (!token) {
    const ins = await query(
      `INSERT INTO tokens (user_discord_id, token_value, token_name) VALUES ($1, $2, $3) RETURNING *`,
      [discordId, tokenValue, tokenName]
    );
    token = ins.rows[0];
    isNew = true;
  }

  const images = [];
  for (let i = 1; i <= 5; i++) {
    const att = interaction.options.getAttachment(`image${i}`);
    if (att) images.push(att.url);
  }

  const jobRes = await query(
    `INSERT INTO ad_jobs (token_id, user_discord_id, message, channel_ids, delay_seconds, images, is_running)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
    [token.id, discordId, message, JSON.stringify(channelIds), delay, JSON.stringify(images)]
  );
  const jobId = jobRes.rows[0].id;
  await startAdJob(jobId, interaction.client);

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '📢 Ad Campaign Started!',
      fields: [
        { name: 'Job ID', value: `#${jobId}`, inline: true },
        { name: 'Token', value: `${isNew ? '🆕 ' : ''}${token.token_name}`, inline: true },
        { name: 'Channels', value: `${channelIds.length} channel(s)`, inline: true },
        { name: 'Delay', value: `${delay}s per cycle`, inline: true },
        { name: 'Images', value: `${images.length} attached`, inline: true },
        { name: 'Message Preview', value: message.length > 100 ? message.substring(0, 100) + '…' : message }
      ],
      footer: { text: 'AutoAdv Bot • All channels sent first, then delay starts' }
    }]
  });
}
