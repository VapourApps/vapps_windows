window.addEventListener('load', function() {

    var ipcRenderer = require('electron').ipcRenderer;
    var responseElem = document.getElementById('response');
    var signBtn = document.getElementById('signBtn');
    var loginScreen = document.getElementById('login-screen');
    var homeScreen = document.getElementById('home-screen');
    var backupScreen = document.getElementById('backup-screen');
    var restoreScreen = document.getElementById('restore-screen');
    var backupBtn = document.getElementById('backupBtn');
    var addBtn = document.getElementById('addBtn');
    var saveBtn = document.getElementById('saveBtn');
    var restoreBtn = document.getElementById('restoreBtn');
    var backupTableRef = document.querySelector('#backupFiles tbody');
    var restoreTableRef = document.querySelector('#restoreTbl tbody');
    var backupResponse = document.getElementById('responseBackup');
    var restoreResponse = document.getElementById('responseRestore');
    var backupOutput = document.getElementById('backup-result');
    var loginDot = document.getElementById('login-dot');
    var backupDot = document.getElementById('backup-dot');
    var paths = [];

    function addRow(arr, row){
        arr.forEach((elem, index) => {
            var newCell = row.insertCell(index);
            var newText = document.createTextNode(elem);
            newCell.appendChild(newText);
        });
    }

    function getName(n){
      let arr = n.split('\\');
      let name = arr[arr.length - 1].split(/[^a-zA-Z0-9]+/).join('').toLowerCase();
      if(name.length < 3) name += '00';
      return name;
    }

    function addInput(row, index, attrs){
        var newCell = row.insertCell(index);
        var x = document.createElement("INPUT");
        for(let key in attrs){
          x.setAttribute(key, attrs[key]);
        }
        newCell.appendChild(x);
    }

    function addButton(row, index, rowIndex, label, onClick){
        var newCell = row.insertCell(index);
        var btn = document.createElement("BUTTON");
        var t = document.createTextNode(label);
        btn.appendChild(t);
        btn.onclick = onClick;
        newCell.appendChild(btn);
    }

    function generateBackupRow(rowNum, arr) {
        var newRow = backupTableRef.insertRow(rowNum);
        let name = arr.pop();
    		addRow(arr, newRow);
        addInput(newRow, 2, {type: "text", value: name});
    		addButton(newRow, 3, rowNum, "Remove", function(){
            paths.splice(rowIndex, 1);
            backupTableRef.innerHTML = "";
            generateTable('backup', paths);
        });
    }

    function generateRestoreRow(rowNum, arr) {
        var newRow = restoreTableRef.insertRow(rowNum);
        addRow(arr, newRow);
        let inputId = `path${rowNum}`;
        addInput(newRow, 2, {type: "file", webkitdirectory: true, id: inputId});
        addButton(newRow, 3, rowNum, "Restore", function(){
          let tmp = document.getElementById(inputId).files;
          tmp.length > 0 && ipcRenderer.send('restoreBackup', {bucket: arr[1], path: tmp[0].path});
        });
    }

    function generateTable(type, arr){
      if(type === 'backup'){
        arr.forEach((a, index) => {
            generateBackupRow(index, [index + 1, ...a]);
        });
      }else{
        arr.forEach((a, index) => {
            generateRestoreRow(index, [index + 1, a]);
        });
      }
    }

    document.getElementById('home-page').onclick = function(){
      homeScreen.classList.remove("hidden");
      backupScreen.classList.add("hidden");
      loginScreen.classList.add("hidden");
      restoreScreen.classList.add("hidden");
    }

    document.getElementById('submitBtn').onclick = function(){
        var data = {url: document.getElementById('url').value, data: {username: document.getElementById('username').value, password: document.getElementById('password').value}};
        console.log(data);
        ipcRenderer.send('login', data);
    }

    ipcRenderer.on('signedIn', function() {
  		document.querySelectorAll('[disabled]').forEach(function(elem) {
  			elem.removeAttribute('disabled');
  		});
  		signBtn.innerHTML = "Logout";
      loginDot.style.backgroundColor = "green";
    });

    ipcRenderer.on('setPaths', function(evt, data) {
        paths = data;
        generateTable('backup', paths);
    });

	ipcRenderer.on('formSubmissionResults', function(event, result) {
        if(result.type === 'ok'){
            document.querySelectorAll('[disabled]').forEach(function(elem) {
                elem.removeAttribute('disabled');
            });
            signBtn.innerHTML = "Logout";
            homeScreen.classList.remove("hidden");
            loginScreen.classList.add("hidden");
            loginDot.style.backgroundColor = "green";
        }else{
            responseElem.classList.remove("hidden");
            responseElem.innerHTML = result.message;
        }
	});

    signBtn.onclick = function(){
        if(signBtn.innerHTML == "Login"){
            loginScreen.classList.remove("hidden");
            homeScreen.classList.add("hidden");
        }else{
            signBtn.innerHTML = "Login";
            ipcRenderer.send('logout');
            document.querySelectorAll('#buttons button').forEach(function(elem) {
              elem.disabled = true;
            });
            loginDot.style.backgroundColor = "red";
        }
    }

    backupBtn.onclick = function(){
        homeScreen.classList.add("hidden");
        backupScreen.classList.remove("hidden");
    }

    addBtn.onclick = function(){
        var input = document.getElementById('backupFilesInput').files[0];
        var rowNum = backupTableRef.rows.length;
        var name = getName(input.path);
		    generateBackupRow(rowNum, [rowNum + 1, input.path]);
        paths.push([input.path, name]);
    }

    saveBtn.onclick = function(){
      //TODO get values from inputs and update paths variable
        ipcRenderer.send('saveBackup', paths);
    }

    restoreBtn.onclick = function(){
        ipcRenderer.send('lsBackups', paths);
    }

    ipcRenderer.on('showRestore', function(event, result) {
      generateTable('restore', result.buckets);
      homeScreen.classList.add("hidden");
      restoreScreen.classList.remove("hidden");
    });

    ipcRenderer.on('saveResult', function(event, result) {
      backupResponse.classList.remove("hidden");
      backupResponse.innerHTML = "";
      if(result.type === 'ok'){
        backupResponse.classList.remove("alert-danger");
        backupResponse.classList.add("alert-success");
      }else{
        backupResponse.classList.remove("alert-success");
        backupResponse.classList.add("alert-danger");
      }
      backupResponse.innerHTML = result.message;
    });

    ipcRenderer.on('restoreResult', function(event, result) {
      restoreResponse.classList.remove("hidden");
      restoreResponse.innerHTML = "";
      if(result.type === 'ok'){
        restoreResponse.classList.remove("alert-danger");
        restoreResponse.classList.add("alert-success");
      }else{
        restoreResponse.classList.remove("alert-success");
        restoreResponse.classList.add("alert-danger");
      }
      restoreResponse.innerHTML = result.message;
    });


    ipcRenderer.on('setBackupOutput', function(event, result) {
      //backupOutput.classList.remove("hidden");
      backupOutput.innerHTML = "";
      if(result.type === 'ok'){
        // backupOutput.classList.add("alert-success");
        backupDot.style.backgroundColor = "green";
      }else{
        // backupResponse.classList.add("alert-danger");
        backupDot.style.backgroundColor = "red";
      }
      backupOutput.innerHTML = result.message;

      if(result.init){
        ipcRenderer.send('syncBackup');
      }
    });


    ipcRenderer.on('changeContent', function(event, name) {
    });

})
