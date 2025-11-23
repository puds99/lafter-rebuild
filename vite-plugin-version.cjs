/**
 * Vite Plugin: Version Injection
 * 
 * Automatically injects version information into src/version.ts at build time.
 * Reads from VERSION.txt and Git metadata to populate constants.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function versionInjectPlugin() {
    return {
        name: 'vite-plugin-version-inject',

        /**
         * Runs during config resolution to load version info
         */
        configResolved() {
            // Read version from VERSION.txt
            const versionFile = path.join(__dirname, 'VERSION.txt');
            const version = fs.existsSync(versionFile)
                ? fs.readFileSync(versionFile, 'utf-8').trim()
                : '0.0.0-unknown';

            // Get Git metadata
            let gitCommit = 'unknown';
            let gitBranch = 'unknown';

            try {
                gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
                gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
            } catch (error) {
                console.warn('⚠️ Could not retrieve Git metadata:', error.message);
            }

            // Get build timestamp
            const buildDate = new Date().toISOString();

            // Store in plugin scope
            this.versionInfo = {
                APP_VERSION: version,
                BUILD_DATE: buildDate,
                GIT_COMMIT: gitCommit,
                GIT_BRANCH: gitBranch
            };

            console.log('📦 Version Info Injected:');
            console.log(`   Version: ${version}`);
            console.log(`   Commit:  ${gitCommit.substring(0, 7)}`);
            console.log(`   Branch:  ${gitBranch}`);
            console.log(`   Built:   ${buildDate}`);
        },

        /**
         * Transform src/version.ts to replace placeholders
         */
        transform(code, id) {
            // Only transform src/version.ts
            if (!id.endsWith('src/version.ts')) {
                return null;
            }

            let transformed = code;

            // Replace each placeholder with actual value
            Object.entries(this.versionInfo).forEach(([key, value]) => {
                const placeholder = `__${key}__`;
                transformed = transformed.replace(
                    new RegExp(placeholder, 'g'),
                    JSON.stringify(value)
                );
            });

            return {
                code: transformed,
                map: null // No source map needed for simple replacements
            };
        }
    };
}

module.exports = versionInjectPlugin;
