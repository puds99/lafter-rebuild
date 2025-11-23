#!/usr/bin/env node

/**
 * Automated Version Bumping Script
 * 
 * Usage:
 *   node scripts/bump-version.js patch         # 0.10.0 → 0.10.1
 *   node scripts/bump-version.js minor         # 0.10.0 → 0.11.0
 *   node scripts/bump-version.js major         # 0.10.0 → 1.0.0
 *   node scripts/bump-version.js --dry-run patch  # Test without changes
 * 
 * What it does:
 *   1. Reads VERSION.txt
 *   2. Increments version based on semver rules
 *   3. Updates VERSION.txt and package.json
 *   4. Creates Git commit with conventional format
 *   5. Tags the release (vX.Y.Z)
 *   6. Pushes to remote with tags
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VERSION_FILE = path.join(__dirname, '..', 'VERSION.txt');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const DRY_RUN = process.argv.includes('--dry-run');
const BUMP_TYPE = process.argv.find(arg => ['patch', 'minor', 'major'].includes(arg));

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

/**
 * Parse semantic version string
 */
function parseVersion(versionString) {
    const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(-[\w.]+)?$/);
    if (!match) {
        throw new Error(`Invalid version format: ${versionString}`);
    }

    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        label: match[4] || ''
    };
}

/**
 * Increment version based on bump type
 */
function bumpVersion(version, type) {
    const newVersion = { ...version };

    switch (type) {
        case 'major':
            newVersion.major += 1;
            newVersion.minor = 0;
            newVersion.patch = 0;
            break;
        case 'minor':
            newVersion.minor += 1;
            newVersion.patch = 0;
            break;
        case 'patch':
            newVersion.patch += 1;
            break;
        default:
            throw new Error(`Invalid bump type: ${type}`);
    }

    return newVersion;
}

/**
 * Format version object to string
 */
function formatVersion(version) {
    return `${version.major}.${version.minor}.${version.patch}${version.label}`;
}

/**
 * Execute shell command with optional dry-run
 */
function exec(command, description) {
    if (DRY_RUN) {
        console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would execute: ${colors.blue}${command}${colors.reset}`);
        return '';
    }

    console.log(`${colors.green}[EXEC]${colors.reset} ${description}`);
    try {
        return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error) {
        console.error(`${colors.red}[ERROR]${colors.reset} Command failed: ${command}`);
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Write file with optional dry-run
 */
function writeFile(filePath, content, description) {
    if (DRY_RUN) {
        console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would write to: ${colors.blue}${filePath}${colors.reset}`);
        console.log(`${colors.magenta}Content preview:${colors.reset}\n${content.substring(0, 200)}...`);
        return;
    }

    console.log(`${colors.green}[WRITE]${colors.reset} ${description}`);
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Conventional commit message generator
 */
function getCommitMessage(oldVersion, newVersion, type) {
    const scope = type === 'major' ? 'breaking' : 'release';
    const verb = type === 'major' ? 'Release' : 'Bump';
    const typePrefix = type === 'major' ? 'feat!' : 'chore';

    return `${typePrefix}(${scope}): ${verb} version to v${formatVersion(newVersion)}\n\nPrevious: v${formatVersion(oldVersion)}\nType: ${type}`;
}

/**
 * Main execution
 */
function main() {
    console.log(`\n${colors.magenta}=====================================${colors.reset}`);
    console.log(`${colors.magenta}   VERSION BUMP SCRIPT${colors.reset}`);
    console.log(`${colors.magenta}=====================================${colors.reset}\n`);

    // Validate arguments
    if (!BUMP_TYPE) {
        console.error(`${colors.red}Error:${colors.reset} Missing bump type. Use: patch, minor, or major`);
        console.error(`Example: node scripts/bump-version.js patch`);
        process.exit(1);
    }

    // Check if VERSION.txt exists
    if (!fs.existsSync(VERSION_FILE)) {
        console.error(`${colors.red}Error:${colors.reset} VERSION.txt not found at ${VERSION_FILE}`);
        process.exit(1);
    }

    // Check if package.json exists
    if (!fs.existsSync(PACKAGE_JSON)) {
        console.error(`${colors.red}Error:${colors.reset} package.json not found at ${PACKAGE_JSON}`);
        process.exit(1);
    }

    // Read current version
    const currentVersionString = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
    console.log(`${colors.blue}Current version:${colors.reset} ${currentVersionString}`);

    // Parse and bump version
    const currentVersion = parseVersion(currentVersionString);
    const newVersion = bumpVersion(currentVersion, BUMP_TYPE);
    const newVersionString = formatVersion(newVersion);

    console.log(`${colors.green}New version:${colors.reset} ${newVersionString}`);
    console.log(`${colors.yellow}Bump type:${colors.reset} ${BUMP_TYPE.toUpperCase()}\n`);

    if (DRY_RUN) {
        console.log(`${colors.yellow}[DRY-RUN MODE]${colors.reset} No changes will be made.\n`);
    }

    // Step 1: Update VERSION.txt
    writeFile(VERSION_FILE, newVersionString, 'Updating VERSION.txt');

    // Step 2: Update package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
    packageJson.version = newVersionString;
    writeFile(
        PACKAGE_JSON,
        JSON.stringify(packageJson, null, 2) + '\n',
        'Updating package.json'
    );

    // Step 3: Git add changes
    exec('git add VERSION.txt package.json', 'Staging version files');

    // Step 4: Git commit with conventional format
    const commitMessage = getCommitMessage(currentVersion, newVersion, BUMP_TYPE);
    const escapedMessage = commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    exec(`git commit -m "${escapedMessage}"`, 'Creating Git commit');

    // Step 5: Create Git tag
    const tagName = `v${newVersionString}`;
    const tagMessage = `Release ${tagName}`;
    exec(`git tag -a ${tagName} -m "${tagMessage}"`, `Creating tag ${tagName}`);

    // Step 6: Push to remote (with tags)
    exec('git push origin main --tags', 'Pushing to remote with tags');

    console.log(`\n${colors.green}✅ Success!${colors.reset} Version bumped to ${colors.magenta}v${newVersionString}${colors.reset}\n`);

    if (!DRY_RUN) {
        console.log(`${colors.blue}Next steps:${colors.reset}`);
        console.log(`  • Update CHANGELOG.txt with release notes`);
        console.log(`  • Verify deployment triggered on Vercel`);
        console.log(`  • Monitor build status\n`);
    }
}

// Handle errors gracefully
try {
    main();
} catch (error) {
    console.error(`\n${colors.red}❌ Fatal error:${colors.reset} ${error.message}\n`);
    process.exit(1);
}
