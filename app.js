var request = require('request');
var util = require('util');
var config = require('./config.json');
var debug = true;

function logDebug() {
    if (debug) {
        console.log.apply(console, Array.prototype.slice.call(arguments));
    }
}

function log() {
    console.log.apply(console, Array.prototype.slice.call(arguments));
}

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


Worker.prototype.isLogin = function () {
    var filter = this.jar.cookies.filter(function (x) {
        return x.name === '_marrla_uid_'
    });
    return filter.length > 0;
};

Worker.prototype.isSelected = function () {
    var filter = this.jar.cookies.filter(function (x) {
        return x.name === '_idle_chara_id_'
    });
    return filter.length > 0;
};

Worker.prototype.fight = function () {
    var self = this;
    var fast = self.config.fast;
    request(makeRequestConfig({
        url: 'http://idle.marrla.com/f2.aspx',
        data: {x: fast ? '1' : '', "_": self.tick ? self.tick++ : (self.tick = Date.now())},
        jar: self.jar
    }), function (err, res, body) {
        var delay = 2000;
        if (err || !self.isLogin()) {
            log('request failed. login again.');
            process.nextTick(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            log('request failed. try again.');
            setTimeout(function () {
                self.fight();
            }, 2000);
        } else if (!self.isSelected()) {
            log('request failed. select again.');
            process.nextTick(function () {
                self.select();
            });
        } else {
            try {
                body = JSON.parse(body);
                if (util.isArray(body) && body.length > 0) {
                    var tmp = body[body.length - 1];
                    log(util.format('%s[lv%d] die:%s exp:%d gold:%d drop:%s',
                        tmp.cnm, tmp.clv, tmp.die, tmp.gold || 0, tmp.exp || 0, tmp.equip || 'null'));
                    delay = tmp.tun * 2000 + Math.random() * 2000;
                    setTimeout(function () {
                        self.fight();
                    }, Math.max(delay, 5000 + Math.random() * 1000));
                } else if (body.ffoe) {
                    delay = body.ffoe < 1000 ? body.ffoe * (1500 + Math.random() * 0.5) : body.ffoe;
//                    log('waiting' + (delay / 1000) + '...');
                    setTimeout(function () {
                        self.fight();
                    }, delay);
                } else {
//                    log('waiting...');
                    setTimeout(function () {
                        self.fight();
                    }, 10000);
                }
            }
            catch (e) {
                logDebug(body);
                logDebug(e);
                log('response is unhandled. login again.');
                setTimeout(function () {
                    self.login();
                }, 2000);
            }
        }
    });
};

Worker.prototype.select = function (id) {
    var self = this;
    log(id ? 'select:' + id : 'selecting');
    request(makeRequestConfig({
        url: 'http://idle.marrla.com/SelectChara.aspx',
        data: !id ? undefined : {id: id},
        jar: self.jar
    }), function (err, res, body) {
        if (err || !self.isLogin()) {
            process.nextTick(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            process.nextTick(function () {
                self.select();
            })
        } else if (!id) {
            var regExp = /<a id="all_chara_rpt_select_link_(\d)".*?<\/a>/ig;
            var regExp2 = /\?id=(\d+)/i;
            var match = null;
            var text = '';
//            var i = 0;
            do {
                match = regExp.exec(String(body));
                if (match && match[1] == self.config.index) {
                    id = 0;
                    if ((text = match[0].match(regExp2))) {
                        id = text[1];
                    }
                }
            }
            while (match && !id);
            if (id) {
                process.nextTick(function () {
                    self.select(id);
                })
            } else {
                if (id === undefined) {
                    log('not existed index:' + self.config.index);
                } else {
                    log('banned,wait for 16 minutes.');
                    setTimeout(function () {
                        self.select();
                    }, 1000 * 60 * 16);
                }
            }
        } else if (id && !self.isSelected()) {
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
    self.jar = request.jar();
    var now = Date.now();
    var config = self.config;
    log('login' + config.email);
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
        if (err || !self.isLogin()) {
            logDebug(body || err);
            log(config.email + 'login failed.');
            setTimeout(function () {
                self.login();
            }, 2000);
        } else {
            process.nextTick(function () {
                self.select();
            })
        }
    });
    return self;
};


config.forEach(function (conf) {
    new Worker(conf).login();
});