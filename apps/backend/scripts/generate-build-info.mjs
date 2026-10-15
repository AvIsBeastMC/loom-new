import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

// 1. Current Branch & Commit
const branch = run('git rev-parse --abbrev-ref HEAD') || 'unknown';
const headCommit = run('git rev-parse --short HEAD') || 'unknown';

// 2. Compare against remote tracking branch
let diffSummary = '';
let commitsAhead = 0;
let commitsBehind = 0;

const upstream = run('git rev-parse --abbrev-ref @{upstream}');
if (upstream) {
  // Number of unpushed/unpulled commits
  const countStr = run('git rev-list --left-right --count HEAD...@{upstream}');
  if (countStr) {
    const [ahead, behind] = countStr.split('\t').map(Number);
    commitsAhead = ahead || 0;
    commitsBehind = behind || 0;
  }
  // List of files that differ from remote (commits + working tree combined)
  diffSummary = run(`git diff --stat ${upstream}...HEAD`);
}

// 3. Local working tree status (uncommitted test changes)
const porcelain = run('git status --porcelain');
const uncommittedFiles = porcelain ? porcelain.split('\n') : [];
const isDirty = uncommittedFiles.length > 0;

// 4. Construct payload
const buildMeta = {
  timestamp: new Date().toISOString(),
  branch,
  headCommit,
  upstream: upstream || null,
  isClean: !isDirty && commitsAhead === 0,
  isDirty,
  commitsAhead,
  commitsBehind,
  uncommittedFiles,
  diffSummary: diffSummary || 'Matches remote branch exactly',
};

// Write out to a shared file accessible to apps/packages
const outputPath = path.resolve('build-info.json');
fs.writeFileSync(outputPath, JSON.stringify(buildMeta, null, 2));

console.log(`[build-info] Captured build state for branch "${branch}" (Dirty: ${isDirty}, Ahead: ${commitsAhead})`);