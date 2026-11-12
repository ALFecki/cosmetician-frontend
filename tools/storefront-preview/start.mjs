import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createPreviewServer, PREVIEW_ACCOUNT, PREVIEW_ORIGIN } from './server.mjs';

async function checkPort(port) {
    const probe = createServer();
    probe.listen(port, '127.0.0.1');
    await once(probe, 'listening');
    await new Promise(resolve => probe.close(resolve));
}

try {
    await checkPort(4300);
    await checkPort(4301);
} catch (error) {
    console.error(`Preview cannot start: ports 4300 and 4301 must be free (${error.code}). Existing services were left untouched.`);
    process.exit(1);
}

const backend = process.env.SKVIDERM_PREVIEW_BACKEND === 'true';
const api = createPreviewServer({ backend });
api.listen(4301, '127.0.0.1');
await once(api, 'listening');
console.log(
    `\nISOLATED STOREFRONT TEST — ${PREVIEW_ORIGIN}\nPhone view: ${PREVIEW_ORIGIN}/__preview/phone.html\nLocal fake account: ${PREVIEW_ACCOUNT.email} / ${PREVIEW_ACCOUNT.password}\nUse invented data only. ${backend ? 'Orders persist in the isolated preview database. SMS mode is configured by the local backend launcher.' : 'Orders reset on stop.'} No email or payment gateway is contacted. Ctrl+C stops both servers.\n`,
);
const angular = spawn(
    process.execPath,
    ['node_modules/@angular/cli/bin/ng.js', 'serve', '--configuration', 'testing', '--host', '127.0.0.1', '--port', '4300'],
    {
        stdio: 'inherit',
        env: { ...process.env, NG_BUILD_MAX_WORKERS: '2', NODE_OPTIONS: '--max-old-space-size=4096' },
    },
);
let stopping = false;
function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    angular.kill('SIGTERM');
    api.closeAllConnections();
    api.close(() => process.exit(code));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
angular.on('error', error => {
    console.error(error.message);
    stop(1);
});
angular.on('exit', code => stop(code || 0));
api.on('error', error => {
    console.error(error.message);
    stop(1);
});
