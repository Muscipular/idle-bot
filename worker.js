"use strict";
var request = require('request');
var util = require('util');
var debug = true;
var maxShortRequest = 5;
var severList = {
    "1": "http://idle.marrla.com/",
    "2": "http://idle2.marrla.com/"
};

function logDebug(format) {
    if (debug) {
        if (arguments.length > 1) {
            console.log(util.format.apply(util, Array.prototype.slice.call(arguments)));
        }
        else {
            console.log(format);
        }
    }
}

function log(format) {
    if (arguments.length > 1) {
        console.log(util.format.apply(util, Array.prototype.slice.call(arguments)));
    }
    else {
        console.log(format);
    }
}

var makeRequestConfig = function (config) {
    return {
        url: config.url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36",
            "Referer": config.referer
        },
        qs: config.data,
        jar: config.jar,
        timeout: 15000
    };
};

var Worker = function (conf) {
    this.config = conf;
    this.jar = request.jar();
    this.shortRequest = 0;
    this.lv = 0;
    this.expTotal = 0;
    this.expLevel = 0;
    this.tunTotal = 0;
    this.tunLevel = 0;
};

Worker.prototype.next = function (fn, delay) {
    var self = this;
    delay = delay || 0;
    if (delay < 2000) {
        self.shortRequest++;
    } else {
        self.shortRequest = self.shortRequest === 0 ? 0 : self.shortRequest - 1;
    }
    if (self.shortRequest > maxShortRequest) {
        delay = 5000 + Math.random() * 1500;
        self.shortRequest = 0;
    }
    if (delay > 0) {
        setTimeout(fn, delay);
    } else {
        process.nextTick(fn);
    }
};

Worker.prototype.isLogin = function () {
    var filter = this.jar.cookies.filter(function (x) {
        return x.name === '_marrla_uid_';
    });
    return filter.length > 0;
};

Worker.prototype.isSelected = function () {
    var filter = this.jar.cookies.filter(function (x) {
        return x.name === '_idle_chara_id_';
    });
    return filter.length > 0;
};

Worker.prototype.fight = function () {
    var self = this;
    var fast = self.config.fast;
    request(makeRequestConfig({
        url: severList[self.config.server || '1'] + 'f2.aspx',
        data: {x: fast ? '1' : '', "_": self.tick ? self.tick++ : (self.tick = Date.now())},
        jar: self.jar
    }), function (err, res, body) {
        var delay = 2000;
        if (err) {
            logDebug(err);
            log('request failed. try again.');
            self.next(function () {
                self.fight();
            }, 2000);
        } else if (!self.isLogin()) {
            log('request failed. login again.');
            self.next(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            log('request failed. try again.');
            self.next(function () {
                self.fight();
            }, 2000 + Math.random() * 300);
        } else if (!self.isSelected()) {
            log('request failed. select again.');
            self.next(function () {
                self.select();
            });
        } else {
            try {
                body = JSON.parse(body);
                if (util.isArray(body) && body.length > 0) {
                    var tmp = body[body.length - 1];
                    var expp = (tmp.mxp * 100 / tmp.nxp).toFixed(2);
                    delay = tmp.tun * 2000 + Math.random() * 2000;
                    if(tmp.clv > self.lv) {
                        self.lv = +tmp.clv;
                        self.expLevel = +tmp.exp || 0;
                        self.tunLevel = +tmp.tun || 0;
                    } else {
                        self.expLevel += +tmp.exp || 0;
                        self.tunLevel += +tmp.tun || 0;
                    }
                    self.expTotal += +tmp.exp || 0;
                    self.tunTotal += +tmp.tun || 0;
                    log('%s[lv%d(%d%)] die:%s gold:%d exp:%d(+%d%) tun:%d ept:%d\n'+
                    	'%s ae:%d at:%d ap:%d lp:%d drop:%s',
                        tmp.cnm, tmp.clv, expp, tmp.die, tmp.gold || 0, tmp.exp || 0, ((tmp.exp || 0) * 100 / tmp.nxp).toFixed(2), tmp.tun, parseInt((tmp.exp || 0) / tmp.tun),
                        tmp.cnm.replace(/./g,'+'), self.expTotal, self.tunTotal, parseInt(self.expTotal / self.tunTotal), parseInt(self.expLevel / self.tunLevel), tmp.equip || 'null');
                    self.next(function () {
                        self.fight();
                    }, Math.max(delay, 5000 + Math.random() * 1000));
                } else if (body.ffoe) {
                    delay = body.ffoe < 1000 ? body.ffoe * (1500 + Math.random() * 0.5) : body.ffoe;
                    self.tunLevel += +body.ffoe || 0;
                    self.tunTotal += +body.ffoe || 0;
                    //                    log('waiting' + (delay / 1000) + '...');
                    self.next(function () {
                        self.fight();
                    }, delay);
                } else {
//                    log('waiting...');
                    self.next(function () {
                        self.fight();
                    }, 10000);
                }
            }
            catch (e) {
                logDebug(body);
                logDebug(e);
                log('response is unhandled. login again.');
                self.next(function () {
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
        url: severList[self.config.server || '1'] + 'SelectChara.aspx',
        data: !id ? undefined : {id: id},
        jar: self.jar
    }), function (err, res, body) {
        if (err || !self.isLogin()) {
            self.next(function () {
                self.login();
            });
        } else if (res.statusCode != 200) {
            self.next(function () {
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
                self.next(function () {
                    self.select(id);
                })
            } else {
                if (id === undefined) {
                    log('%s not existed index:%d', self.config.email, self.config.index);
                } else {
                    log('%s:%d banned,wait for 16 minutes.', self.config.email, self.config.index);
                    self.next(function () {
                        self.select();
                    }, 1000 * 60 * 16);
                }
            }
        } else if (id && !self.isSelected()) {
            self.next(function () {
                self.select();
            })
        } else {
            self.next(function () {
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
    log('login %s:%d', config.email, config.index);
    var url = "http://www.marrla.com/ajax_login.ashx";
    request(makeRequestConfig({
        url: url,
        referer: severList[config.server || '1'] + "Login.aspx",
        data: {
            jsonp: 'jQuery' + parseInt(Math.random() * 10000000) + "_" + now,
            email: config.email,
            pwd: config.password,
            "_": now
        },
        jar: self.jar
    }), function (err, res, body) {
        if (err) {
            logDebug(err);
            self.next(function () {
                self.select();
            }, 2000);
        } else if (!self.isLogin()) {
            logDebug(body);
            log('%s:%d login failed.', config.email, config.index);
            self.next(function () {
                self.login();
            }, 2000);
        } else {
            self.next(function () {
                self.select();
            })
        }
    });
    return self;
};


process.on('message', function (conf) {
    logDebug(process.pid);
    setTimeout(function () {
        new Worker(conf).login();
    }, Math.random() * 3000);
});