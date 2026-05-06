import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { getOrCreateUser } from '../utils/checkKey.js';

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];

export const data = new SlashCommandBuilder()
  .setName('admin_reseller')
  .setDescription('[Admin] Manage reseller accounts')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a reseller and give credits')
      .addUserOption(opt => opt.setName('user').setDescription('User to make reseller').setRequired(true))
      .addIntegerOption(opt => opt.setName('credits').setDescription('Starting credits').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('give')
      .setDescription('Give credits to an existing reseller')
      .addUserOption(opt => opt.setName('user').setDescription('Reseller to give credits to').setRequired(true))
      .addIntegerOption(opt => opt.setName('credits').setDescription('Credits to give').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove reseller status')
      .addUserOption(opt => opt.setName('user').setDescription('User to remove reseller from').setRequired(true))
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (OWNER_IDS.length && !OWNER_IDS.includes(interaction.user.id)) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Admin Only', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  const sub = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser('user');
  const credits = interaction.options.getInteger('credits') || 0;

  await getOrCreateUser(targetUser.id, targetUser.username);

  if (sub === 'add') {
    await query(
      `UPDATE users SET is_reseller = TRUE, reseller_balance = reseller_balance + $1 WHERE discord_id = $2`,
      [credits, targetUser.id]
    );
    return interaction.editReply({
      embeds: [{
        color: 0x57F287,
        title: '✅ Reseller Added',
        description: `**${targetUser.username}** is now a reseller with **${credits}** credit(s).`,
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  } else if (sub === 'give') {
    await query(
      `UPDATE users SET reseller_balance = reseller_balance + $1 WHERE discord_id = $2`,
      [credits, targetUser.id]
    );
    return interaction.editReply({
      embeds: [{
        color: 0x57F287,
        title: '✅ Credits Given',
        description: `Gave **${credits}** credit(s) to **${targetUser.username}**.`,
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  } else if (sub === 'remove') {
    await query(`UPDATE users SET is_reseller = FALSE, reseller_balance = 0 WHERE discord_id = $1`, [targetUser.id]);
    return interaction.editReply({
      embeds: [{
        color: 0x57F287,
        title: '✅ Reseller Removed',
        description: `**${targetUser.username}** is no longer a reseller.`,
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }
}
