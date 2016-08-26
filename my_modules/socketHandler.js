module.exports = function(io, streams) {
  io.on('connection', function(client) {
    console.log('-- ' + client.id + ' joined --');
    client.emit('id', client.id);
    client.on('message', function (details) {
      var otherClient = io.sockets.connected[details.to];
      if (!otherClient) return false;
      delete details.to;
      details.from = client.id;
      otherClient.emit('message', details);
    });
      
    // receive notification when stream is ready
    client.on('readyToStream', function(options) {
      console.log('-- ' + client.id + ' is ready to stream --');
      var user_ip = client.request.connection.remoteAddress || 'NA';
      streams.addStream(client.id, options.name, options.user_type, user_ip, function(err, doc){
        if(err) console.log(err);
      });

      // send notification to all users when new stream coming; notify user-self & need to notify other users
      // client.emit('stream_notification', 'stream_on')
      notifyUsersWithUpdateStreamsInfo('stream_on', client.id);
    });
    
    // update stream info.
    client.on('update', function(options) {
      streams.update(client.id, options.name, options.user_type, function(err, result){
        if(err) console.log(result);
      });
    });

    // service notification
    client.on('serviceNotification', function(arg_details){
      //
      var client_to = io.sockets.connected[arg_details.to];
      if(!client_to) return false;
      arg_details['from'] = client.id;
      console.log(arg_details);
      client_to.emit('serviceNotification', arg_details);
    });

    function leave(arg_type) {
      console.log('-- ' + client.id + ' left --');
      streams.removeStream(client.id, arg_type, function(err, result){
        if(err) console.log(result);
      });

      // send notification to all users when stream leaves
      // client.emit('stream_notification', 'stream_off');
      notifyUsersWithUpdateStreamsInfo('stream_off', client.id);
    }

    // notification to update stream list and video conatiner
    function notifyUsersWithUpdateStreamsInfo(arg_notification_key, arg_client_id_from){
      var clients = io.sockets.connected;
      if(!clients || clients.length === 0){
        return false;
      }
      for(var key in clients){
        console.log('socket-key: ' + key);
        clients[key].emit('stream_notification', { notification_key: arg_notification_key, client_id_from: arg_client_id_from });
      }
    }

    client.on('disconnect', leave);
    client.on('leave', leave);
  });
};