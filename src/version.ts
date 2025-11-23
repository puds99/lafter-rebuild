/**
 * Version Information
 * 
 * This file contains build-time version metadata.
 * 
 * TODO: Automate this via pre-build script that reads VERSION.txt and Git metadata.
 * For now, manually update when running `node scripts/bump-version.js`
 */

export const APP_VERSION = '0.11.0-beta';
export const BUILD_DATE = new Date().toISOString();
export const GIT_COMMIT = 'phase-11-integration';  // Replace with actual commit hash manually
export const GIT_BRANCH = 'main';
