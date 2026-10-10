import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function resolveAndroidJavaHome() {
  const candidates = [process.env.ANDROID_JAVA_HOME, process.env.JAVA_HOME].filter(Boolean);
  const home = process.env.USERPROFILE || process.env.HOME;
  if (process.platform === 'darwin') {
    for (const version of ['17', '21']) {
      const result = spawnSync('/usr/libexec/java_home', ['-v', version], { encoding: 'utf8' });
      if (result.status === 0) candidates.push(result.stdout.trim());
    }
  }
  const roots = home ? [join(home, '.jdks')] : [];
  if (process.platform === 'win32' && process.env.ProgramFiles) {
    roots.push(join(process.env.ProgramFiles, 'Eclipse Adoptium'), join(process.env.ProgramFiles, 'Java'));
  }
  for (const root of roots) {
    if (existsSync(root)) for (const entry of readdirSync(root)) candidates.push(join(root, entry));
  }
  for (const candidate of candidates) {
    const executable = join(candidate, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!existsSync(executable)) continue;
    const result = spawnSync(executable, ['-version'], { encoding: 'utf8' });
    const major = Number(`${result.stderr || ''}${result.stdout || ''}`.match(/version "(\d+)/)?.[1]);
    if (result.status === 0 && [17, 21].includes(major)) return candidate;
  }
  return null;
}
