#!/usr/bin/env node
/**
 * publish.js
 * 
 * Deployment script for start.ng platform:
 * 1. Pre-flight check: POST https://api.start.ng/games/check
 * 2. Publish trigger: POST https://api.start.ng/games/publish
 * 
 * Payload schema:
 * { "repo_url": "<REPO_URL>", "name": "spellbridge" }
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const GAME_NAME = 'spellbridge';
const API_BASE = 'https://api.start.ng/games';

function getRepoUrl() {
  // 1. Check command line args
  const argUrl = process.argv.slice(2).find((arg) => arg.startsWith('http') || arg.startsWith('git@'));
  if (argUrl) return argUrl;

  // 2. Read from git config
  try {
    const gitRemote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    if (gitRemote) {
      // Normalize git@github.com:User/Repo.git to https://github.com/User/Repo
      if (gitRemote.startsWith('git@github.com:')) {
        return `https://github.com/${gitRemote.replace('git@github.com:', '').replace(/\.git$/, '')}`;
      }
      return gitRemote.replace(/\.git$/, '');
    }
  } catch (err) {
    // Git command failed
  }

  return 'https://github.com/MUFTIATBAKARE/spellbridge';
}

function verifyLocalBuild() {
  console.log('🔍 Verifying local build outputs...');

  const requiredFiles = [
    'dist/index.html',
    'dist/startng.json',
    'dist/cover.png',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing required file: ${relPath}`);
      console.error('Run "npm run build" first before publishing.');
      process.exit(1);
    }
  }

  // Check that index.html uses relative paths
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'dist/index.html'), 'utf8');
  if (indexHtml.includes('src="/') || indexHtml.includes('href="/')) {
    console.warn('⚠️ Warning: Absolute paths detected in dist/index.html. start.ng requires relative paths (./)');
  } else {
    console.log('✅ Asset paths verified (relative ./ format)');
  }

  console.log('✅ Local build files verified successfully.\n');
}

async function postJson(endpoint, payload) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  const repoUrl = getRepoUrl();
  const payload = {
    repo_url: repoUrl,
    name: GAME_NAME,
  };

  console.log('====================================');
  console.log('🚀 SpellBridge 3D - start.ng Publisher');
  console.log('====================================');
  console.log(`Target Repo: ${payload.repo_url}`);
  console.log(`Game Name:   ${payload.name}\n`);

  verifyLocalBuild();

  // Step 1: Pre-Flight Check
  console.log(`📡 [1/2] Running Pre-Flight Check on ${API_BASE}/check ...`);
  const checkResult = await postJson(`${API_BASE}/check`, payload);

  if (checkResult.ok) {
    console.log('✅ Pre-flight check PASSED!\n');
  } else {
    console.warn(`⚠️ Pre-flight check status ${checkResult.status || 'network error'}:`, checkResult.data || checkResult.error);
    console.log('Proceeding with publish attempt...\n');
  }

  // Step 2: Publish Trigger
  console.log(`🚀 [2/2] Triggering Deployment via ${API_BASE}/publish ...`);
  const publishResult = await postJson(`${API_BASE}/publish`, payload);

  if (publishResult.ok) {
    console.log('🎉 Publish request submitted successfully!');
    console.log(`Your game will be live at: https://${GAME_NAME}.start.ng/`);
    if (publishResult.data) {
      console.log('Server response:', JSON.stringify(publishResult.data, null, 2));
    }
  } else {
    console.log(`ℹ️ Publish response (${publishResult.status || 'network'}):`, publishResult.data || publishResult.error);
    console.log('\nNote: Once your latest commit is pushed to GitHub, start.ng pulls dist/ directly.');
  }
}

main();
