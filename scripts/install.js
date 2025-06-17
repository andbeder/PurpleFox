const { execSync } = require('child_process');

function hasSfCli() {
  try {
    execSync('sf --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasSfCli()) {
  console.log('Salesforce CLI not found. Installing...');
  try {
    execSync('npm install --global @salesforce/cli --silent', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to install Salesforce CLI:', err.message);
    process.exit(1);
  }
} else {
  console.log('Salesforce CLI already installed.');
}
