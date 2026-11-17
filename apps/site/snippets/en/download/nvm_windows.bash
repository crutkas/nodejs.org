# First download and run the nvm-windows v2 installer for ${props.platform}:
# https://github.com/nvm-windows/nvm/releases/download/v2.0.1/nvm-2.0.1-${props.platform}-setup.exe
# Run setup as your standard user, not as Administrator.
# Back up global packages; setup can migrate and uninstall existing Node.js.
# Complete setup, then reopen PowerShell before running the commands below.
# nvm-windows installs Node.js for the architecture of its own installer.

# Download and activate the selected Node.js version:
nvm install ${props.release.version}
if ($LASTEXITCODE -ne 0) { throw "Node.js installation failed." }
nvm use ${props.release.version}
if ($LASTEXITCODE -ne 0) { throw "Node.js activation failed." }
