import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TESTING_DIR = path.join(PROJECT_ROOT, 'testing');
const TEMPLATE_PATH = path.join(TESTING_DIR, 'template.txt');

// Ensure testing directory exists
if (!fs.existsSync(TESTING_DIR)) {
    fs.mkdirSync(TESTING_DIR);
}

// Ensure template exists
if (!fs.existsSync(TEMPLATE_PATH)) {
    const defaultTemplate = `TEST REPORT\nDate: {{DATE}}\n\n{{OUTPUT}}`;
    fs.writeFileSync(TEMPLATE_PATH, defaultTemplate);
}

// Determine Vitest path
const VITEST_PATH = path.join(PROJECT_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest');

console.log('🚀 Running tests with:', VITEST_PATH);

// Use spawn instead of exec to stream output and avoid buffering issues
const child = spawn(VITEST_PATH, ['run', '--reporter=verbose'], {
    cwd: PROJECT_ROOT,
    shell: true,
    env: { ...process.env, CI: 'true' } // Force CI mode to prevent watch interactions
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
    const chunk = data.toString();
    process.stdout.write(chunk);
    stdout += chunk;
});

child.stderr.on('data', (data) => {
    const chunk = data.toString();
    process.stderr.write(chunk);
    stderr += chunk;
});

child.on('close', (code) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const output = stdout + '\n' + stderr;

    // Parse basic stats from output
    const totalMatch = output.match(/Tests\s+(\d+)\s+total/);
    const passedMatch = output.match(/Tests\s+.*\s+(\d+)\s+passed/);
    const failedMatch = output.match(/Tests\s+.*\s+(\d+)\s+failed/);
    const durationMatch = output.match(/Duration\s+(.+)/);

    const total = totalMatch ? totalMatch[1] : '?';
    const passed = passedMatch ? passedMatch[1] : (code === 0 ? total : '0');
    const failed = failedMatch ? failedMatch[1] : (code !== 0 ? '1+' : '0');
    const duration = durationMatch ? durationMatch[1] : '?';

    let report = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    report = report.replace('{{DATE}}', dateStr);
    report = report.replace('{{TIME}}', timeStr);
    report = report.replace('{{ENV}}', process.env.NODE_ENV || 'development');
    report = report.replace('{{TOTAL}}', total);
    report = report.replace('{{PASSED}}', passed);
    report = report.replace('{{FAILED}}', failed);
    report = report.replace('{{DURATION}}', duration);
    report = report.replace('{{OUTPUT}}', output);

    const reportPath = path.join(TESTING_DIR, `report_${timestamp}.txt`);
    fs.writeFileSync(reportPath, report);

    console.log(`\n✅ Test report generated: ${reportPath}`);

    if (code !== 0) {
        console.error('❌ Tests failed.');
        process.exit(1);
    }
});

child.on('error', (err) => {
    console.error('Failed to start subprocess:', err);
    process.exit(1);
});
