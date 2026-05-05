import { query } from '../db/index.js';
import { maskToken } from './keys.js';

const activeJobs = new Map();

async function sendMessageToChannel(token, channelId, message, images = []) {
  try {
    const body = { content: message };
    let response;

    if (images && images.length > 0) {
      const { default: FormData } = await import('form-data');
      const { default: fetch } = await import('node-fetch');
      const form = new FormData();
      form.append('payload_json', JSON.stringify(body));
      response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: token },
        body: form
      });
    } else {
      const { default: fetch } = await import('node-fetch');
      response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }

    return { ok: response.ok, status: response.status };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

export async function startAdJob(jobId, client) {
  if (activeJobs.has(jobId)) return false;

  const run = async () => {
    while (activeJobs.has(jobId)) {
      const rows = await query(
        `SELECT aj.*, t.token_value FROM ad_jobs aj 
         JOIN tokens t ON t.id = aj.token_id 
         WHERE aj.id = $1 AND aj.is_running = TRUE`,
        [jobId]
      );
      if (!rows.rows[0]) {
        activeJobs.delete(jobId);
        break;
      }

      const job = rows.rows[0];
      const channels = job.channel_ids || [];
      const images = job.images || [];

      for (const channelId of channels) {
        if (!activeJobs.has(jobId)) break;
        await sendMessageToChannel(job.token_value, channelId, job.message, images);
        await sleep(1200);
      }

      await query(`UPDATE ad_jobs SET last_cycle_at = NOW() WHERE id = $1`, [jobId]);

      const delayMs = (job.delay_seconds || 60) * 1000;
      await sleep(delayMs);
    }
  };

  activeJobs.set(jobId, true);
  run().catch(() => activeJobs.delete(jobId));
  return true;
}

export async function stopAdJob(jobId) {
  activeJobs.delete(jobId);
  await query(`UPDATE ad_jobs SET is_running = FALSE WHERE id = $1`, [jobId]);
}

export function isJobRunning(jobId) {
  return activeJobs.has(jobId);
}

export async function restoreJobs(client) {
  const rows = await query(`SELECT id FROM ad_jobs WHERE is_running = TRUE`);
  for (const row of rows.rows) {
    await startAdJob(row.id, client);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
