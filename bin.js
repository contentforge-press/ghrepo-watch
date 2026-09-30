#!/usr/bin/env node
// repo-watch — free CLI for GitHub Repo Change Intelligence
// No dependencies. Free quota, then Hobby $9/mo (USDC, instant key).
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const HOST = process.env.REPO_WATCH_HOST || 'https://github-intel.contentforge-press.workers.dev';
const CONFIG_DIR = join(homedir(), '.repo-watch');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfig() {
    try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}
function saveConfig(c) {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2));
}
function installId(cfg) {
    if (!cfg.install) {
        cfg.install = 'inst_' + randomHex(16);
        saveConfig(cfg);
    }
    return cfg.install;
}
function randomHex(n) {
    const b = new Uint8Array(n);
    globalThis.crypto.getRandomValues(b);
    return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

const HELP = `repo-watch — track GitHub releases & maintenance from your terminal

Usage:
  repo-watch <owner/repo>                 free snapshot (stars, issues, latest release)
  repo-watch changes <owner/repo>         what's new since last check (free quota, then Hobby)
  repo-watch intel <owner/repo>           maintenance & health report
  repo-watch batch <a,b,c>                scan many repos at once
  repo-watch landscape <a,b,c>            rank & flag abandoned projects
  repo-watch login                        upgrade — pay USDC, key delivered automatically
  repo-watch status                       show plan & usage
  repo-watch help

Free quota per 30 days: 20 changes, 20 intel, 3 batch, 3 landscape.
Hobby $9/mo removes limits and the attribution line. Snapshot is always free.
`;

async function api(path) {
    const r = await fetch(HOST + path, { headers: { 'x-install-id': installId(loadConfig()) } });
    let j = null; try { j = await r.json(); } catch { j = {}; }
    return { status: r.status, j };
}

function printSnapshot(j) {
    const d = j.data ?? j;
    console.log(`${d.repo}  ★ ${d.stars}  issues ${d.openIssues}  pushed ${(d.pushedAt || '').slice(0, 10)}`);
    (d.latestReleases || []).slice(0, 3).forEach(x => console.log(`  release ${x.tag}  ${(x.publishedAt || '').slice(0, 10)}`));
}

async function main() {
    const argv = process.argv.slice(2);
    const cfg = loadConfig();
    const cmd = argv[0] || 'help';

    if (cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); return; }

    if (cmd === 'login') { await login(cfg); return; }

    if (cmd === 'status') {
        console.log(`install: ${cfg.install || '(none)'}`);
        console.log(`key:     ${cfg.key ? cfg.key.slice(0, 12) + '…' : '(not logged in)'}`);
        return;
    }

    // snapshot: always free
    if (!['changes', 'intel', 'batch', 'landscape'].includes(cmd)) {
        const target = cmd;
        const { status, j } = await api(`/v1/snapshot?target=${encodeURIComponent(target)}`);
        if (status !== 200) return fail(j);
        printSnapshot(j);
        return;
    }

    // metered tools
    let q;
    if (cmd === 'batch' || cmd === 'landscape') {
        const targets = (argv[1] || '').split(',').map(s => s.trim()).filter(Boolean);
        q = `tool=${cmd}&targets=${encodeURIComponent(targets.join(','))}`;
    } else {
        q = `tool=${cmd}&target=${encodeURIComponent(argv[1] || '')}`;
    }
    const keyQ = cfg.key ? `&key=${encodeURIComponent(cfg.key)}` : '';
    const { status, j } = await api(`/v1/cli?${q}${keyQ}`);

    if (status === 402) {
        console.error('\n' + (j.message || 'Free quota used.'));
        if (j.valueDelivered?.length) {
            console.error('\nValue delivered so far:');
            j.valueDelivered.forEach(w => console.error('  • ' + w));
        }
        console.error(`\nUpgrade: Hobby $${j.hobby?.price ?? 9}/mo — run: repo-watch login`);
        return;
    }
    if (status !== 200) return fail(j);
    console.log(JSON.stringify(j.data, null, 2));
    if (j.attribution) console.error('\n' + j.attribution);
}

async function login(cfg) {
    console.log('Creating a Hobby order ($9/mo)…');
    const r = await fetch(`${HOST}/v1/order?plan=hobby`);
    const o = await r.json();
    if (o.error) { console.error('Could not create order: ' + o.error); return; }
    console.log(`
Send exactly  ${o.amountUsd} USDC
on Base (ERC-20)
to            ${o.payTo}

From any exchange or wallet. Order expires in 60 minutes.
Waiting for confirmation…`);
    const start = Date.now();
    while (Date.now() - start < 55 * 60 * 1000) {
        await new Promise(res => setTimeout(res, 8000));
        const c = await (await fetch(`${HOST}/v1/order/check?id=${o.orderId}`)).json();
        if (c.status === 'paid') {
            cfg.key = c.accessKey;
            saveConfig(cfg);
            console.log(`\n✅ Paid. Access key saved: ${c.accessKey}`);
            console.log('One key works across the whole change-intelligence family.');
            return;
        }
        if (c.status === 'expired') { console.error('Order expired. Run login again.'); return; }
    }
    console.error('Timed out waiting for payment.');
}

function fail(j) {
    console.error('Request failed: ' + (j.error || j.detail || 'unknown error'));
    if (j.retry) console.error(j.retry);
    process.exitCode = 1;
}

main().catch(e => { console.error('Error: ' + (e?.message || e)); process.exit(1); });
