/**
*
*/
const Shell = require('node-powershell');

const anyProxyCertReg = /CN=AnyProxy,\sOU=AnyProxy\sSSL\sProxy/;

/**
 * detect whether root CA is trusted
 */
function ifWinRootCATrusted() {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    debugMsg: false,
    noProfile: true
  });

  return new Promise((resolve, reject) => {
    ps.addCommand('Get-ChildItem', [
      {
        name: 'path',
        value: 'cert:\\CurrentUser\\Root'
      }
    ]);
    ps.invoke()
      .then((output) => {
        const isCATrusted = anyProxyCertReg.test(output);
        ps.dispose();
        resolve(isCATrusted);
      })
      .catch((err) => {
        console.log(err);
        ps.dispose();
        resolve(false);
      });
  })
}

module.exports.ifWinRootCATrusted = ifWinRootCATrusted;
