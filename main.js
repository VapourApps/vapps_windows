const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const request = require('request');
const os = require('os');
const fs = require('fs');
const storage = require('electron-json-storage');
const { exec } = require('child_process');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
var syncInterval;

storage.update = function(key, json){
    this.get(key, (error, data) => {
        let obj = Object.assign(data, json);
        this.set(key, obj);
    });
}

function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 800, height: 600, show: false})

    // win.setMenu(null);

    // load the index.html of the app.
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'src/index.html'),
      protocol: 'file:',
      slashes: true
    }))

    // Emitted when the window is closed.
    win.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      win = null
    })

    storage.get('config', (error, data) => {
        if(data.token || data.paths){
            win.webContents.on('did-finish-load', () => {
                data.token && win.webContents.send('signedIn');
                data.paths && win.webContents.send('setPaths', data.paths);
                data.backupOutput && win.webContents.send('setBackupOutput', Object.assign(data.backupOutput, {init: true}));
                win.show();
            });
        }else{
            win.show();
        }
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow()
    }
})

ipcMain.on('login', (event, data) => {
   // Access form data here
	request({url: `${data.url}/api/login`,
        body: data.data,
        method: 'POST',
        json: true
    }, (err, res, body) => {
        if (res.statusCode == 200) {
            storage.set('config', {token: body.data.token});
            request({url: `${data.url}/api/panels/action`,
                  body: {server_name: "va-objectstore", action: "get_auth"},
                  method: 'POST',
                  headers: {
                    'Authorization': `Token ${body.data.token}`
                  },
                  json: true
              }, (err, res, body) => {
                if (res.statusCode == 200) {
                  exec(`C:\\VapourApps\\mc.exe config host add va-buckets https://va-objectstore.balkantel.va.mk ${body.data.accessKey} ${body.data.secretKey}`, (error, stdout, stderr) => {
                    if(error)
                      event.sender.send('formSubmissionResults', {type: 'error', message: stderr});
                    else
                      event.sender.send('formSubmissionResults', {type: 'ok', message: 'You are logged in!'});
                    console.log(`stdout: ${stdout}`);
                    console.log(`stderr: ${stderr}`);
                  });
                }else{
                  event.sender.send('formSubmissionResults', {type: 'error', message: body.message});
                }
            });
        }else {
            event.sender.send('formSubmissionResults', {type: 'error', message: body.message});
        }
	});
});

ipcMain.on('logout', () => {
  storage.set('config', {token: ''});
});

const MC_PATH = 'C:\\VapourApps\\mc.exe';
const SYNC_PATH = 'C:\\VapourApps\\sync.bat';

ipcMain.on('saveBackup', (event, data) => {
    storage.update('config', {paths: data});
    if (fs.existsSync(MC_PATH)) {
      execSync(event, data);
    }else{
        var stream = request('https://dl.minio.io/client/mc/release/windows-amd64/mc.exe').pipe(fs.createWriteStream(MC_PATH));
        stream.on('finish', function () {
          execSync(event, data);
        });
        stream.on('error', function () {
          event.sender.send('saveResult', {type: 'error', message: 'Error with installing mc'});
          storage.update('config', {backupOutput: {type: 'error', message: 'Error with installing mc'}});
          event.sender.send('setBackupOutput', {type: 'error', message: 'Error with installing mc'});
        });
    }
});

ipcMain.on('lsBackups', (event, data) => {
  exec("C:\\VapourApps\\mc.exe --C c:\\VapourApps ls va-buckets/", (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      let arr = stdout.split("\n");
      const regExp = /\dB ([\w-\.]+)\\/;
      let buckets = [];
      for(let i=0; i<arr.length; i++){
        var m = regExp.exec(arr[i]);
        m && buckets.push(m[1]);
      }
      event.sender.send('showRestore', {type: 'ok', buckets: buckets});
  });
});

ipcMain.on('restoreBackup', (event, data) => {
  exec(`C:\\VapourApps\\mc.exe --C c:\\VapourApps mirror --no-color -q --overwrite --remove  va-buckets/${data.bucket} ${data.path} >> c:\\VapourApps\\restore.log 2>&1`, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          event.sender.send('restoreResult', {type: 'error', message: error.message});
          return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      event.sender.send('restoreResult', {type: 'ok', message: "Last restore is ok"});
  });
});

ipcMain.on('syncBackup', (event, data) => {
  checkSyncLog(event);
  syncInterval = setInterval(() => {
    checkSyncLog(event);
  }, 3000 * 60);
});

function execSync(event, data) {
  let writeStream = fs.createWriteStream(SYNC_PATH);
  writeStream.once('open', function(fd) {
      writeStream.write("@echo off\r\necho Last sync > c:\\VapourApps\\sync.log 2>&1\r\n");
      data.forEach(bucket => {
          // let arr = bucket[0].split('\\');
          // let folderName = arr[arr.length - 1].split(/[^a-zA-Z0-9]+/).join('').toLowerCase();
          // if(folderName.length < 3) folderName += '00';
          var cmd = `${MC_PATH} --no-color --C c:\\\\VapourApps mb "va-buckets/${bucket[1]}"`;
          console.log('CMD', cmd);
          exec(cmd, (error, stdout, stderr) => {
              if (error) {
                  console.error(`exec error: ${error}`);
                  //event.sender.send('saveResult', {type: 'error', message: 'Error on creating buckets.'});
                  return;
              }
              console.log(`stdout: ${stdout}`);
              console.log(`stderr: ${stderr}`);
          });
          writeStream.write(`C:\\VapourApps\\mc.exe --C c:\\\\VapourApps mirror --no-color -q --overwrite --remove "${bucket[0]}" "va-buckets/${bucket[1]}" >> c:\\VapourApps\\sync.log 2>&1\r\n`);
      });
      writeStream.end();
      //exec('C:\\VapourApps\\restore.bat');
      exec('C:\\VapourApps\\sync_tasks.bat', (error, stdout, stderr) => {
          if (error) {
              console.error(`exec error: ${error}`);
              event.sender.send('saveResult', {type: 'error', message: 'Error reading sync_tasks.bat'});
              storage.update('config', {backupOutput: {type: 'error', message: 'Error reading sync_tasks.bat'}});
              event.sender.send('setBackupOutput', {type: 'error', message: 'Error reading sync_tasks.bat'});
              return;
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
          setTimeout(() => {
            checkSyncLog(event);
            clearInterval(syncInterval);
            syncInterval = setInterval(() => {
              checkSyncLog(event);
            }, 3000 * 60);
          }, 3000);
      });
  });
}

function checkSyncLog(event){
  fs.stat("C:\\VapourApps\\sync.log", function(err, stats){
    if(err){
      event.sender.send('saveResult', {type: 'error', message: 'Error reading sync.log'});
      storage.update('config', {backupOutput: {type: 'error', message: 'Error reading sync.log'}});
      event.sender.send('setBackupOutput', {type: 'error', message: 'Error reading sync.log'});
      return;
    }
    let mtime = new Date(stats.mtime);
    if((mtime.getTime() - new Date())/60 <= 3000){
      fs.readFile("C:\\VapourApps\\sync.log", 'utf8', function(err, data) {
        let msg, type = 'error';
        if (err) {
          msg = 'Error reading sync.log';
          event.sender.send('saveResult', {type: 'error', message: msg});
        }
        else{
          let index = data.indexOf('<ERROR>');
          if(index >= 0){
           msg = data.substring(index + 7);
           event.sender.send('saveResult', {type: 'error', message: msg});
          }else{
           msg = "Last sync was OK";
           type = 'ok';
           event.sender.send('saveResult', {type: 'ok', message: msg});
          }
        }
        storage.update('config', {backupOutput: {type: type, message: msg}});
        event.sender.send('setBackupOutput', {type: type, message: msg});
      });
    }else{
      event.sender.send('saveResult', {type: 'error', message: 'Error: log file is not updated.'});
      storage.update('config', {backupOutput: {type: 'error', message: 'Error: log file is not updated.'}});
      event.sender.send('setBackupOutput', {type: 'error', message: 'Error: log file is not updated.'});
    }
  });
}
