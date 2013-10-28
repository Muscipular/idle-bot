var config = require('./config.json');
var fork = require('child_process').fork;
require('./worker');
var multiTask = false;

console.log(process.pid);

config.forEach(function (conf, i) {
    if (i > 0 && multiTask) {
        var cp = fork('./worker.js');
        cp.send(conf);
        conf.cp = cp;
    } else {
        process.emit('message', conf);
    }
});

process.on('SIGINT', function () {
    config.forEach(function (conf, i) {
        if (i > 0 && multiTask) {
            conf.cp.kill();
        }
    });
    process.exit();
});