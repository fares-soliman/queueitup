var ul = document.getElementById("devicelist");
var ul_queue = document.getElementById("queuelist");
var center_artwork = document.getElementById("center_artwork");
var loading_circle = document.getElementsByClassName("loader")[0];
var closebtns = document.getElementsByClassName("close");
let serviceUuid_const = "e20a39f4-73f5-4bc4-a12f-17d1ad07a961";
var myCharacteristic;


const masterlist = [];
var music = ''
var firstconnect = true;

var Device = {
  name: "Name",
  service: "Service UUID",
  charac: "Characteristic ID",
  mychar: {}
};

function isWebBluetoothEnabled() {
  if (navigator.bluetooth) {
    return true;
  } else {
    alert('Web Bluetooth API is not available.\n' +
      'Please make sure the "Experimental Web Platform features" flag is enabled.');
    return false;
  }
}

document.addEventListener('musickitloaded', async function () {
  // MusicKit global is now defined.
  try {
    const music_config = await MusicKit.configure({
      developerToken: 'Enter token here',
      app: {
        name: 'QueueItUp',
        build: '1',
      }
    });
  } catch (err) {
    console.log(err)
  }

  // MusicKit instance is available
  music = await MusicKit.getInstance();

  await music.authorize();

  music.addEventListener('nowPlayingItemDidChange', ({ item }) => {

    if (typeof item === 'undefined') {
      if (music.queue.position !== music.queue.items.length - 1) {
        music.skipToNextItem()
      }
      return
    }

    const songName = item.attributes.name;
    const artistName = item.attributes.artistName;
    const songNameField = document.getElementsByClassName("songName")[0]
    const artistNameField = document.getElementsByClassName("artistName")[0]

    songNameField.innerHTML = songName;
    artistNameField.innerHTML = artistName;

    console.log(`Now playing ${songName} ${artistName}`);

    center_artwork.source = item.attributes.artwork;

    updateQueue();
  });

  music.addEventListener('queueItemsDidChange', updateQueue);

});

function updateQueue() {
  ul_queue.innerHTML = ''

  if (music.queue.position == music.queue.items.length - 1) {
    return
  }

  music.queue.items.slice(music.queue.position + 1, music.queue.items.length).forEach(element => {
    var nameAndArtistDiv = document.createElement("div");
    nameAndArtistDiv.classList.add('nameAndArtistQueueItem')
    const songName = element.attributes.name;
    const artistName = element.attributes.artistName;
    const songNameField = document.createElement("h3");
    const artistNameField = document.createElement("h4");

    songNameField.innerHTML = songName;
    artistNameField.innerHTML = artistName;

    songNameField.style.margin = '0px';
    artistNameField.style.margin = '0px';

    nameAndArtistDiv.appendChild(songNameField);
    nameAndArtistDiv.appendChild(artistNameField);

    var entireQueueListItem = document.createElement("div");
    entireQueueListItem.classList.add('completeQueueItem');

    var artwork = document.createElement('apple-music-artwork');

    artwork.source = element.attributes.artwork;
    artwork.width = '75px';

    entireQueueListItem.appendChild(artwork);
    entireQueueListItem.appendChild(nameAndArtistDiv);

    nameAndArtistDiv.style.flex = "1";

    ul_queue.appendChild(entireQueueListItem);
  });
}

//adding device to devices list 
function addli(pName, pService, pChar, pMyChar) {
  var li = document.createElement("li");
  li.classList.add('deviceslist')
  var span = document.createElement("span");
  span.className = "close";
  span.addEventListener("click", function (e) {
    var devicelist_ul = document.getElementById("devicelist");
    console.log(masterlist)
    console.log(devicelist_ul.childNodes)
    console.log(e.target.parentNode)
    var index = Array.prototype.indexOf.call(devicelist_ul.childNodes, e.target.parentNode)
    console.log(index)
    console.log(devicelist_ul)
    if (masterlist[index].mychar) {
      masterlist[index].mychar.stopNotifications()
        .then(_ => {
          console.log(masterlist)
          console.log(masterlist[index])
          console.log(masterlist[index].name)
          console.log('> Notifications stopped for ' + masterlist[index].name);
          masterlist[index].mychar.removeEventListener('characteristicvaluechanged',
            handleNotifications);
          masterlist.splice(index, 1)
          e.target.parentNode.remove();
        })
        .catch(error => {
          console.log('Argh! ' + error);
        });
    }

  });
  li.innerHTML = pName;
  span.innerHTML = "&times;"
  li.appendChild(span);
  ul.appendChild(li);
}

async function handleNotifications(event) {
  let value = event.target.value;
  let a = [];
  // Convert raw data bytes to hex values just for the sake of showing something.
  // In the "real" world, you'd use data.getUint8, data.getUint16 or even
  // TextDecoder to process raw data bytes.
  for (let i = 0; i < value.byteLength; i++) {
    a.push(String.fromCharCode(value.getUint8(i)));
  }
  console.log('> ' + a.join(''));
  if (firstconnect === true) {
    await music.setQueue({ song: a.join(''), startPlaying: true });
    firstconnect = false

  }
  else {
    const queryParameters = { l: 'en-us' };
    item = await music.api.music(`/v1/catalog/{{storefrontId}}/songs/${a.join('')}`, queryParameters);


    var mediaitem = new MusicKit.MediaItem({ attributes: item.data.data[0].attributes, id: item.data.data[0].id, type: 'song' })

    // var hey = new MusicKit.MediaItem() 
    // hey.attributes = item.data.data[0].attributes
    // hey.id = item.data.data[0].id
    // hey.type = 'song'
    console.log(mediaitem)
    await music.queue.append([mediaitem]);
  }
  console.log(music.queue.items)
}



function onStartButtonClick() {

  let serviceUuid = serviceUuid_const;
  if (serviceUuid.startsWith('0x')) {
    serviceUuid = parseInt(serviceUuid);
  }

  var Device = {
    name: "Name",
    service: "Service UUID",
    charac: "Characteristic ID",
    mychar: {}
  };

  console.log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice({ filters: [{ services: [serviceUuid] }] })
    .then(device => {
      loading_circle.style.display = "block";
      console.log('Connecting to GATT Server...');
      console.log(device)
      Device.name = device.name
      return device.gatt.connect();
    })
    .then(server => {
      console.log(server)
      console.log('Getting Service...');
      return server.getPrimaryService(serviceUuid);
    })
    .then(service => {
      Device.service = service.uuid
      console.log(service)
      console.log('Getting Characteristic...');
      return service.getCharacteristics();
    })
    .then(characteristics => {
      Device.charac = characteristics[0].uuid;
      Device.mychar = characteristics[0]
      myCharacteristic = characteristics[0];
      console.log(characteristics[0])
      return characteristics[1].readValue()
    })
    .then(value => {
      Device.name = new TextDecoder().decode(value)
      masterlist.push(Device)
      addli(Device.name, Device.service, Device.charac, Device.mychar);
      console.log(masterlist)
      loading_circle.style.display = "none";
      return myCharacteristic.startNotifications().then(_ => {
        console.log('> Notifications started');
        myCharacteristic.addEventListener('characteristicvaluechanged',
          handleNotifications);
      });
    })
    .catch(error => {
      console.log('Argh! ' + error);
      loading_circle.style.display = "none";
    });
}





