const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

async function main() {
  try {
    console.log('=== Starting Clean Android APK Build ===\n');

    // 1. Clean previous build caches
    console.log('Cleaning old build artifacts...');
    const pathsToClean = ['.next', 'out', path.join('android', 'app', 'build')];
    pathsToClean.forEach((p) => {
      const fullPath = path.join(process.cwd(), p);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    });

    // 2. Build Next.js Static Export
    console.log('\nBuilding Next.js export...');
    runCommand('npm run build');

    // 3. Sync web assets with Capacitor
    console.log('\nSyncing assets with Capacitor Android...');
    runCommand('npx cap sync android');

    // 4. Compile Debug APK with Gradle
    console.log('\nCompiling Android APK...');
    const androidDir = path.join(process.cwd(), 'android');
    const gradleCmd = process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';
    runCommand(gradleCmd, androidDir);

    console.log('\n==================================================');
    console.log('SUCCESS! Your new APK is ready at:');
    console.log('android/app/build/outputs/apk/debug/app-debug.apk');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\nBuild failed with error:', error.message);
    process.exit(1);
  }
}

main();
