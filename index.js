class DataEncryptor {
  constructor(password,key) {
    this.password = password.toString();
    this.key = key.toString();
    this.dbSupported = 'index';
    this.eventListeners = {};
    this.createKey();
    this.checkDB();
    //this.createDB();
  }

  createKey() { 
    this.randomKey = this.password + this.key;
    console.log(this.randomKey);
  }

    checkDB() { 
        if(this.checkLocalStorage()){
            this.dbSupported = 'local';
        }
        if(this.checkIndexedDB()){
            this.dbSupported = 'index';
        }
        console.log(this.dbSupported);
    }

    checkLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    checkIndexedDB() {
        if (!window.indexedDB) {
            return false;
        }
            return true;
    }

    createDB(dbName) {
        // Open a connection to the database
        var request = indexedDB.open(dbName, 1);
      
        // Handle successful database opening
        request.onsuccess = function(event) {
          console.log("Database opened successfully!");
        };
      
        // Handle errors when opening the database
        request.onerror = function(event) {
          console.error("An error occurred while opening the database");
        };
    }
      

    createObjectStore(dbName, storeName) {
        let request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function(event) {
          const db = event.target.result;
          var objectStore = db.createObjectStore(storeName, {keyPath: "id", autoIncrement: true});
          objectStore.createIndex("enc_data", "name", {unique: false}); 
        }
        console.log("create object store");
    }

    insertData(dbName, objectStoreName, data) {
        var request = x.open(dbName, 1);
      
        request.onsuccess = function(event) {
          console.log("Database opened successfully!");

          let encData = {enc_data: data};
      
          var db = event.target.result;
          var transaction = db.transaction([objectStoreName], "readwrite");
          var objectStore = transaction.objectStore(objectStoreName);
          var request = objectStore.add(encData);
      
          request.onsuccess = function(event) {
            console.log("Data added successfully!" + JSON.stringify(event));
          };
      
          request.onerror = function(event) {
            console.error("An error occurred while adding the data"+ JSON.stringify(event));
          };
        };
      
        request.onerror = function(event) {
          console.error("An error occurred while opening the database" + event);
        };
    }

  encryptData(dbName,storeName,data) { 

    if(data.length === 0){
      return false;
    }

    if(this.dbSupported=='index'){
        for(let i = 0; i < data.length; i++){ 
          let encData = this.encrypt(JSON.stringify(data[i]),this.randomKey);
          this.insertData(dbName, storeName, encData);
        }
    }
    else{
        this.saveToLocalStorage(encData);
    }
  }

  encrypt(data,key){   
    const encrypted = btoa(key + data);
    console.log(encrypted)
    return encrypted;
  }

   open(dbName) {
    // Open an IndexedDB database and store the database object in the db property
    let request = indexedDB.open(dbName, 1);
    return new Promise((resolve, reject) => {
    // this.db = await new Promise((resolve, reject) => {
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
      request.onerror = function (event) {
        reject(event);
      };
    });
  }

  // fetch data
  async fetchTableFromIndexedDB(dbName,storeName, id) { 
    const dbReturn = await this.open(dbName);

    let transaction = dbReturn.transaction([storeName], 'readonly');
    let objectStore = transaction.objectStore(storeName);

    let request, records = [];

    // If an ID is provided, fetch a single record by its key
    console.log(id);
    if (id) { 
      const request =  objectStore.get(id);
      return new Promise((resolve, reject) => {
        request.onsuccess = function (event) {
          resolve(event.target.result);
        };
        request.onerror = function (event) {
          reject(event);
        };
      });
    } else {
      // Otherwise, open a cursor to iterate over all records in the object store
      request = objectStore.openCursor();

      // Wait for the request to complete
      await new Promise((resolve, reject) => {
        request.onsuccess = function (event) {
          let cursor = event.target.result;
          if (cursor) {
            records.push(cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = function (event) {
          reject(event);
        };
      });
    } 

    // Return the array of records
    return records; 
  }

  async getData(dbName, storeName, key=''){
    
    let data = '';
    if(this.dbSupported=='index'){  
      data = await this.fetchTableFromIndexedDB(dbName,storeName, key);
      return this.decryptData(data)
    }else{
      return false;
    } 
  }
 
  decryptData(data) {  
    let finalData = [];
    if(data.length > 0){
      for(let i =0; i < data.length; i++){ 
        finalData.push(this.decrypt(data[i].enc_data, this.randomKey));
      }
    }else{
      finalData.push(this.decrypt(data.enc_data, this.randomKey))
    } 
    return finalData;
  }

  decrypt(encrypted,key){   
    const decrypted = atob(encrypted).substring(key.length); 
    if(typeof JSON.stringify(decrypted) === 'object'){
      return JSON.parse(JSON.parse(decrypted).replace(/^"|"$/g, ''));
    }
    return decrypted.replace(/^"|"$/g, ''); 
    
  }
  
  setEvent(event, callback) {
    this.eventListeners[event] = callback;
  }

  setGlobalEvent(event, callback) { 
    document.addEventListener(event, callback);
  }

  setTableEvent(table, event, callback) { 
    table.addEventListener(event, callback);
  }

   saveToLocalStorage(key, data) { 
    localStorage.setItem(key, this.encryptData(data));
  }

  fetchFromLocalStorage(key) { 
    const encryptedData = localStorage.getItem(key);
    return this.decryptData(encryptedData);
  }
  
}




 