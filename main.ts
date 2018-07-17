import { app, BrowserWindow, screen, session, remote, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as webtorrent from 'webtorrent';

const os = require('os');
const { shell } = require('electron');
const fsExtra = require('fs-extra');
const fs = require('fs');
const srt2vtt = require('srt-to-vtt');
const zip = require('decompress-zip');
const { exec } = require('child_process');
const curl = require('curlrequest');

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

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

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
    require('electron-reload')(__dirname, {
    });
    win.loadURL('http://localhost:4200');
    win.openDevTools();
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

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
