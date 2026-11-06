const { execSync } = require('child_process');
try {
  const out = execSync('pwsh -NoLogo -ExecutionPolicy Bypass -File "tools/00-Reconcile-SharePoint.ps1" -Apply', {cwd: '/Users/bipulsikder16/Developer/FedEx powerapp', stdio: 'inherit'});
} catch(e) {
  console.log(e.message);
}
