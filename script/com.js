var editor = ace.edit("editor");
editor.setTheme("ace/theme/twilight");
editor.getSession().setMode("");
editor.getSession().setUseWrapMode(true);
editor.getSession().setWrapLimitRange(80, 80);
editor.getSession().setUseSoftTabs(true);

// Connect to PeerJS, have server assign an ID instead of providing one
var peer = new Peer({key: '2lhdgiygysct0529', debug: true});

// Show this peer's ID.
peer.on('open', function(id){
  $('#pid').text(id);
});

// Await connections from others
peer.on('connection', addConnection);

function loadText(readFile) {          
  var reader = new FileReader();
  reader.readAsText(readFile);
  // Handle progress, success, and errors
  reader.onprogress = doNothing1;
  reader.onload = loaded(readFile.name);
  reader.onerror = errorHandler;
}

function doNothing1(evt) {  }
function loaded(fname) {  
  return function(evt){
    // Obtain the read file data    
    var fileString = evt.target.result;
    fileString = fileString.replace("\t","    ");
    // editor.getSession().setValue(fileString);
    editor.insert(fileString);
    $('#filename').val(fname);
  }
}
function errorHandler(evt) {
  if(evt.target.error.name == "NotReadableError") {
    alert('Could not load file.')
  }
}

function handleData(data){
  var fn = function(){ editor.setReadOnly(false); };
  if($('#pid').html() > $('#connections').children()[0].innerHTML){
    onReceiveOperationFromNonTransformer(editor.getSession(), data.op, fn);
  }else{
    onReceiveOperationFromTransformer(editor.getSession(), data.op, fn);
  }
}

// This is called on the other peer when a connection is established.
function addConnection (c) {
  var li = $('<li></li>').html(c.peer);
  $('#connectionNotes').attr("class", 'status active');
  $('#connections').append(li)
  c.on('data', function(data) {
    handleData(data);
  });
  c.on('close', function() {
    alert(c.peer + ' has disconnected.');
  });
}

// This will sent a change to all 
function send (msg) {
  editor.setReadOnly(true);
  var activeCons = $('#connections').children();
  activeCons.each(function() {
    var peerId = $(this).html();
    var conns = peer.connections[peerId];
    var labels = Object.keys(conns);
    for (var i = 0, ii = labels.length; i < ii; i += 1) {
      var c = conns[labels[i]];
      c.send(msg);
    }
  });
}

$(document).ready(function() {
  // Load file on drop.
  var edtr = $('#editor');
  edtr.on('dragenter', doNothing);
  edtr.on('dragover', doNothing);
  edtr.on('drop', function(e){
    e.originalEvent.preventDefault();
    var file = e.originalEvent.dataTransfer.files[0];
    loadText(file);
  });
  function doNothing(e){
    e.preventDefault();
    e.stopPropagation();
  }


  // Connect to a peer
  $('#connect').click(function() {
    var target = $('#rid').val();
    if (target=="") return;
    var activeCons = $('#connections').children();
    var isConnectedAlready = false;
    activeCons.each(function() {
      isConnectedAlready = isConnectedAlready || (this.innerHTML == target);
    });
    if(isConnectedAlready) return;
    // Create a connection.
    var c = peer.connect(target);
    c.on('open', function() {
      addConnection(c);
    });
    c.on('error', function(err) { alert(err); });
  });

  // Change the theme
  $('#theme').change(function(){
    editor.setTheme($('#theme').val());
  });

  // Change the font size
  $('#fontsize').change(function(){
    editor.setFontSize($('#fontsize').val());
  });

  // Change the font size
  $('#mode').change(function(){
    editor.getSession().setMode($('#mode').val());
  });

  // Change the line wrap
  $('#line_wrap').change(function(){
    editor.getSession().setWrapLimitRange($('#line_wrap').val(), $('#line_wrap').val());
  });

  // Upload a file
  $('#files').change(function(evt){
    var file = evt.target.files[0];
    loadText(file);
  });

  // Upload a file
  $('#savebut').click(function(evt){
    window.URL = window.webkitURL || window.URL;

    var prevLink = $('savelink');
    if (prevLink) {
      window.URL.revokeObjectURL(prevLink.attr('href'));
      $('#linkhouse').html('');
    }

    var bb = new Blob([editor.getSession().getValue()], {type: 'text/plain'});

    var a = document.createElement('a');
    a.download = $('#filename').val();
    a.href = window.URL.createObjectURL(bb);
    a.textContent = 'Download';

    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
    a.draggable = true;
    a.classList.add('dragout');

    $('#linkhouse').append(a);

    a.onclick = function(e) {
      setTimeout(function() {
        window.URL.revokeObjectURL(this.href);
        $('#linkhouse').html('');
      }, 1500);
    };
  });
  
  function hide(){
    $('#controls').attr('class', 'noshow');
    $('#but').attr('class', 'show');
    $('#editor').attr('class', 'big');
    editor.setTheme($('#theme').val());
    editor.setFontSize($('#fontsize').val());
  }

  function show(){
    $('#controls').attr('class', '');
    $('#but').attr('class', 'hide');
    $('#editor').attr('class', 'small');
    editor.setTheme($('#theme').val());
    editor.setFontSize($('#fontsize').val());
  }

  $('#but').click(function(){
    if ($('#but').hasClass('hide')) {
      hide();
    } else{
      show();
    };
  });

  setInterval(function(){
     if(($('#connections').children().length == 0) || ($('#pid').html() > $('#connections').children()[0].innerHTML)){
       return;
     }
     timeForMyNeighborToTransform();
  }, 200);
});



// Make sure things clean up properly.
window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
    peer.destroy();
  }
};
