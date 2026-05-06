import { query } from '../db/index.js';

export async function requireKey(interaction) {
  const discordId = interaction.user.id;
  const res = await query(
    `SELECT u.*, lk.expires_at, lk.type FROM users u 
     LEFT JOIN license_keys lk ON lk.id = u.key_id 
     WHERE u.discord_id = $1`,
    [discordId]
  );
  const user = res.rows[0];
  if (!user) {
    await interaction.reply({
      embeds: [{
        color: 0xED4245,
        title: '❌ No Key Found',
        description: 'You need to redeem a key first.\nUse `/redeem_key <key>` to get started.',
        footer: { text: 'AutoAdv Bot' }
      }],
      ephemeral: true
    });
    return null;
  }
  if (user.expires_at && new Date(user.expires_at) < new Date()) {
    await interaction.reply({
      embeds: [{
        color: 0xED4245,
        title: '⏰ Key Expired',
        description: 'Your license key has expired. Please redeem a new key.',
        footer: { text: 'AutoAdv Bot' }
      }],
      ephemeral: true
    });
    return null;
  }
  return user;
}

export async function getOrCreateUser(discordId, username) {
  let res = await query(`SELECT * FROM users WHERE discord_id = $1`, [discordId]);
  if (res.rows[0]) return res.rows[0];
  const ins = await query(
    `INSERT INTO users (discord_id, username) VALUES ($1, $2) RETURNING *`,
    [discordId, username]
  );
  return ins.rows[0];
}
