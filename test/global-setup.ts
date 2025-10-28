import { execSync } from 'child_process';

export default () => {
  process.stdout.write('\n\nGlobal setup\n');
  execSync('docker compose up -d --wait', {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
  });
  execSync('pnpm migration:run', {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
  });
  process.stdout.write('Done!!!\n\n\n');
};
