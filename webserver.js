#!/usr/bin/env node
'use strict';

// Default port for this server is 8080, or DOORBELL_PORT env variable. 
// The default is overridable with -p/--port.
if(process.env.DOORBELL_PORT) {
  console.log(`DOORBELL_PORT set from env variable: ${process.env.DOORBELL_PORT}`)
}
let port = process.env.DOORBELL_PORT || 8080;

const { ArgumentParser } = require('argparse');
const { version } = require('./package.json');

const parser = new ArgumentParser({
  description: 'Argparse functionality'
});

parser.add_argument('-p', '--port', { help: 'Define port for web server' });
let args = parser.parse_args();

if(args.port && !process.env.DOORBELL_PORT) port = parseInt(args.port);

var express = require('express');
var app = express();


var server = app.listen(port);
var io = require('socket.io')(server);
var path = require('path');
var fs = require('fs')

// Configuration constants
const DOORBELL_STATES = {
  AVAILABLE: 'green',
  TRIGGERED: 'red'
};
const DOORBELL_TRIGGER_DURATION_MS = 10000;

const dirPath = path.join(__dirname, '/public');
app.use(express.static(dirPath));

console.log(`Server running on port ${port}`);

var state = DOORBELL_STATES.AVAILABLE;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function (socket) {

  socket.on('error', function(error) {
    // Handle socket errors
  });

  socket.on('disconnect', function(reason) {
    // Handle disconnections
  });

  socket.on('init', function(){
    if(state===DOORBELL_STATES.TRIGGERED){
      io.emit('init');
    }
  })

  socket.on('check', function(value) {
    // Validate input
    if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
      console.warn('Invalid check event value:', value);
      return;
    }

    if (state === DOORBELL_STATES.AVAILABLE && value === 1) {
      //console.log("change:" + value);
      state = DOORBELL_STATES.TRIGGERED;
      fs.readdir(dirPath + "/audio", function(err, files){
        if(err) {
          console.error('Failed to read audio directory:', err);
          state = DOORBELL_STATES.AVAILABLE;
          return;
        }

        if(!files || files.length === 0) {
          console.warn('No audio files found in audio directory');
          state = DOORBELL_STATES.AVAILABLE;
          return;
        }

        let randomSound = files[Math.floor(Math.random() * files.length)];
        //console.log(randomSound);
        io.emit('change', 0, randomSound);
        setTimeout(function(){
          state = DOORBELL_STATES.AVAILABLE;
          //console.log(state);
          io.emit('change', 1);
        }, DOORBELL_TRIGGER_DURATION_MS);
      });
    }
  });
});
