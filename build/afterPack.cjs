const { execSync } = require('node:child_process')
const path = require('node:path')

// electron-builder skips signing when `mac.identity` is null, which leaves the
// bundle only linker-signed (resources unsealed) and can trip Gatekeeper on
// recent macOS. Give the whole bundle a proper ad-hoc signature so it launches.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`  • ad-hoc signing ${appName}.app`)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
}
