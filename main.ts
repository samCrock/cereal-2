import {app, BrowserWindow, screen, session, remote, ipcMain, protocol} from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as webtorrent from 'webtorrent';

const os = require('os');
const {shell} = require('electron');
const fsExtra = require('fs-extra');
const fs = require('fs');
const srt2vtt = require('srt-to-vtt');
const zip = require('decompress-zip');
const { exec } = require('child_process');
const curl = require('curlrequest');

const args = process.argv.slice(1);
let remoteVersion, win, serve;
serve = args.some(val => val === '--serve');

global['wt_client'] = new webtorrent();
global['local_path'] = os.homedir();
global['shell'] = shell;
global['fs'] = fs;
global['fsExtra'] = fsExtra;
global['srt2vtt'] = srt2vtt;
global['zip'] = zip;
global['path'] = path;
global['exec'] = exec;
global['app'] = app;
global['curl'] = curl;

console.log('Local path:', os.homedir(), __dirname);
console.log('Local version:', app.getVersion());

function checkUpdates() {
  return new Promise((resolve, reject) => {
    const installer_path = path.join(app.getPath('appData'), 'Cereal', 'Update_installer.exe');
    // const update_installer = fs.readFileSync(installer_path);
    if (fs.existsSync(installer_path)) {
      console.log('Executing updater..');
      exec(installer_path, function(err) {
        if (err) { reject(err); }
        fs.unlinkSync(installer_path);
        console.log('Done!');
      });
    } else {
      curl.request({url: 'https://raw.githubusercontent.com/samCrock/cereal-2/master/package.json'},
        function (err, data) {
          if (err) {
            resolve();
          }
          remoteVersion = JSON.parse(data).version;
          console.log('Remote version:', remoteVersion);
          if (remoteVersion !== app.getVersion()) {
            global['update'] = true;
          } else {
            global['update'] = false;
          }
          resolve();
        });

    }
  });

}

try {
  require('dotenv').config();
} catch {
  console.log('asar');
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
    webPreferences: {
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
    if (serve) {
      console.log('Dev mode. Skip updates');
      createWindow();
    } else {
      checkUpdates().then(() => {
        createWindow();
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
  // throw e;
}
