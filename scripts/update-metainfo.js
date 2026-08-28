#!/usr/bin/env node
// Prepends a <release> entry to assets/it.buonapp.pos.metainfo.xml at release
// time so the AppImage ships with an up-to-date AppStream release history.
// Reads version from package.json and release notes from CHANGELOG.md (via
// scripts/changelog-notes.sh). The on-disk source file is rewritten; the
// running pipeline does NOT auto-commit this change back to the repo.

const { readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const META_FILE = path.join(ROOT, 'assets/it.buonapp.pos.metainfo.xml');
const NOTES_HELPER = path.join(ROOT, 'scripts/changelog-notes.sh');

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
const date = new Date().toISOString().slice(0, 10);

// Run the helper through bash rather than spawning the .sh directly: Windows
// cannot execute a shell script as a program (EFTYPE), and Windows is the
// platform this fork releases from. Keeping the extraction in one place — the
// same script the release workflow uses — means the two cannot drift.
const section = execFileSync('bash', [NOTES_HELPER, version], { encoding: 'utf8' }).trim();

// AppStream shows this in a software centre's release list, beside entries
// that run a few lines. A whole CHANGELOG section - the summary plus every
// bullet - is an order of magnitude too long for that (3283 characters for
// 4.1.0 against 348 for the 2.0.5 entry next to it), so keep only the
// paragraph the section opens with. A section that dives straight into a
// '### Added' heading has no such paragraph; those fall back to the full
// text rather than shipping an empty <p>.
const summary = section.split(/^###\s/m)[0].trim() || section;

const notes = summary
  .replace(/[\r\n]+/g, ' ')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const xml = readFileSync(META_FILE, 'utf8');
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (new RegExp(`<release\\b[^>]*\\bversion="${escapedVersion}"`).test(xml)) {
  console.log(`release ${version} already present in ${path.basename(META_FILE)} — skipping`);
  process.exit(0);
}

if (!/<releases\b[^>]*>/.test(xml)) {
  throw new Error(`${path.basename(META_FILE)} is missing its <releases> element`);
}

const entry = `
    <release version="${version}" date="${date}">
      <description>
        <p>${notes}</p>
      </description>
    </release>`;

const updated = xml.replace(/(\s*<releases\b[^>]*>)/, `$1${entry}`);
if (updated === xml) {
  throw new Error(`could not insert release ${version}: <releases> element was not recognized`);
}
writeFileSync(META_FILE, updated);
console.log(`prepended <release version="${version}" date="${date}"> to ${path.basename(META_FILE)}`);
