var request = require('request');
var util = require('util');
var config = require('./config.json');

var makeRequestConfig = function (config) {
    return {
        url: config.url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36",
            "Referer": config.referer
        },
        qs: config.data,
        jar: config.jar
    };
};

var Worker = function (conf) {
    this.config = conf;
    this.jar = request.jar();
};

Worker.prototype.fight = function () {
    console.log('fighting');
    var self = this;
    request(makeRequestConfig({
        url: 'http://idle.marrla.com/f2.aspx',
        data: {x: '', "_": self.tick ? self.tick++ : (self.tick = Date.now())},
        jar: self.jar
    }), function (err, res, body) {
        if (err || self.jar.cookies.length < 1) {
            process.nextTick(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            process.nextTick(function () {
                self.fight();
            });
        } else {
            try {
                body = JSON.parse(body);
                if (util.isArray(body)) {
                    setTimeout(function () {
                        self.fight();
                    }, body.length * 2000);
                } else if (body.ffoe) {
                    setTimeout(function () {
                        self.fight();
                    }, body.ffoe < 1000 ? body.ffoe * 1000 : body.ffoe);
                } else {
                    setTimeout(function () {
                        self.fight();
                    }, 2000);
                }
            }
            catch (e) {
                console.log(e);
                setTimeout(function () {
                    self.fight();
                }, 10000);
            }
        }
    });
};

Worker.prototype.select = function (id) {
    var self = this;
    console.log(id ? 'select:' + id : 'selecting');
    request(makeRequestConfig({
        url: 'http://idle.marrla.com/SelectChara.aspx',
        data: !id ? undefined : {id: id},
        jar: self.jar
    }), function (err, res, body) {
        if (err || self.jar.cookies.length < 1) {
            process.nextTick(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            process.nextTick(function () {
                self.select();
            })
        } else if (!id) {
            var regExp = /\?id=(\d+)/gi;
            var match = null;
            var i = 0;
            do {
                match = regExp.exec(String(body));
                if (match && i++ == self.config.index) {
                    id = match[1];
                }
            }
            while (match && !id);
            process.nextTick(function () {
                self.select(id);
            })
        } else if (id && self.jar.cookies.length < 2) {
            process.nextTick(function () {
                self.select();
            })
        } else {
            process.nextTick(function () {
                self.fight();
            })
        }
    });
};

Worker.prototype.login = function () {
    var self = this;
    var now = Date.now();
    var config = self.config;
    console.log('login' + config.email);
    var url = "http://www.marrla.com/ajax_login.ashx";
    request(makeRequestConfig({
        url: url,
        referer: "http://idle.marrla.com/Login.aspx",
        data: {
            jsonp: 'jQuery' + parseInt(Math.random() * 10000000) + "_" + now,
            email: config.email,
            pwd: config.password,
            "_": now
        },
        jar: self.jar
    }), function (err, res, body) {
        if (err || self.jar.cookies.length < 1) {
            console.log(body || err);
            return;
        }
        process.nextTick(function () {
            self.select();
        })
    });
    return self;
};


config.forEach(function (conf) {
    new Worker(conf).login();
});