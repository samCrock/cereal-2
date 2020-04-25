import {app, BrowserWindow, screen} from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as webtorrent from 'webtorrent';

const os = require('os');
const {shell} = require('electron');
const fsExtra = require('fs-extra');
const fs = require('fs');
const srt2vtt = require('srt-to-vtt');
const zip = require('decompress-zip');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const request = require('request');

const args = process.argv.slice(1);
let remoteVersion;
let win;
let serve;
serve = args.some(val => val === '--serve');

global['wt'] = new webtorrent();
global['shell'] = shell;
global['fs'] = fs;
global['fsExtra'] = fsExtra;
global['srt2vtt'] = srt2vtt;
global['zip'] = zip;
global['path'] = path;
global['exec'] = exec;
global['app'] = app;
global['request'] = request;

console.log('Local path:', os.homedir(), __dirname);
console.log('Local version:', app.getVersion());

const installerPath = path.join(app.getPath('appData'), 'Cereal', 'Update_installer.exe');
const updateCheckPath = path.join(app.getPath('appData'), 'Cereal', '_updating');

try {
  require('dotenv').config();
} catch {
  console.log('Launching from executable..');
}

function checkUpdates() {
  return new Promise((resolve, reject) => {

    if (fs.existsSync(installerPath)) {
      console.log('Executing updater..');
      spawn(installerPath, [process.argv], {
        cwd: process.cwd(),
        env: process.env,
        detached: true,
        stdio: 'ignore'
      });
      fs.writeFile(updateCheckPath, '', function(err) {
        process.kill(process.pid);
      });
    } else {
      try {
        request({url: 'https://raw.githubusercontent.com/samCrock/cereal-2/master/package.json'},
          function(err, data) {
            if (err) {
              resolve(1);
            }
            remoteVersion = JSON.parse(data.body).version;
            console.log('Remote version:', remoteVersion);
            global['update'] = remoteVersion !== app.getVersion();
            resolve(1);
          });
      } catch (e) {
        console.log('Cannot perform request', e);
        resolve(0);
      }

    }
  });

}

function createWindow() {
  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  win.setMenu(null);
  win.maximize();

  if (serve) {
    require('electron-reload')(__dirname, {});
    win.loadURL('http://localhost:4200');
    win.openDevTools();
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null;
  });
}

try {
  app.on('ready', () => {
      if (fs.existsSync(updateCheckPath)) {
        fs.unlinkSync(updateCheckPath);
        fs.unlink(installerPath, function(d) {
          console.log('Update completed!');
          createWindow();
        });
      } else {
        console.log('Checking updates..');
        checkUpdates().then(code => {
          console.log('Exit code:', code);
          createWindow();
        }, error => {
          console.log('Updater error:', error);
        });
      }
    }
  );
  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {
  // Catch Error
  throw e;
}
