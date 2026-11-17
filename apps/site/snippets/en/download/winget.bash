# Requires WinGet: https://learn.microsoft.com/windows/package-manager/winget/
# Install the exact selected Node.js version and architecture:
winget install --id ${props.release.status === 'LTS' ? 'OpenJS.NodeJS.LTS' : 'OpenJS.NodeJS'} --exact --source winget --version ${props.release.version} --architecture ${props.platform}
if ($LASTEXITCODE -ne 0) { throw "WinGet could not install this version. Use the prebuilt installer or review the WinGet error." }

# Reopen PowerShell before running the verification commands below.
