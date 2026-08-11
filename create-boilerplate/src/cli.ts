import { execSync } from 'node:child_process';

import { Command } from 'commander';
import pc from 'picocolors';

import { runWizard } from './prompts';
import { scaffold } from './scaffold';

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('create-stackbase')
    .description('Scaffold a new project from Stackbase')
    .argument('[project-name]', 'name of the project / target directory')
    .action(async (projectNameArg?: string) => {
      const answers = await runWizard(projectNameArg);
      const result = scaffold(answers);

      console.log('');
      console.log(pc.green(`✔ Project created at ${result.targetDir}`));
      console.log(pc.dim(`  ${result.copiedPaths.length} paths copied`));

      if (answers.gitInit) {
        try {
          execSync('git init', { cwd: result.targetDir, stdio: 'inherit' });
          execSync('git add -A', { cwd: result.targetDir, stdio: 'inherit' });
          execSync('git commit -m "Initial commit from create-stackbase"', {
            cwd: result.targetDir,
            stdio: 'inherit',
          });
        } catch (err) {
          console.error(pc.red('✖ git init failed:'), err instanceof Error ? err.message : err);
          process.exitCode = 1;
        }
      }

      if (answers.installDeps) {
        const installCmd =
          answers.packageManager === 'pnpm'
            ? 'pnpm install'
            : answers.packageManager === 'yarn'
              ? 'yarn install'
              : 'npm install';
        try {
          execSync(installCmd, { cwd: result.targetDir, stdio: 'inherit' });
        } catch (err) {
          console.error(
            pc.red(`✖ ${installCmd} failed:`),
            err instanceof Error ? err.message : err,
          );
          process.exitCode = 1;
        }
      }

      console.log('');
      console.log(pc.cyan('Next steps:'));
      console.log(`  cd ${result.targetDir}`);
      if (!answers.installDeps) console.log(`  ${answers.packageManager} install`);
      console.log(`  ${answers.packageManager} run dev`);
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
