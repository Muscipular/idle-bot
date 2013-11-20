(function FilterItem() {
    var el = $('<div id="FilterItem"></div>');
    el.append($('<input type="text" id="txtFilterItem" />'));
    el.append($('<input type="button" id="btnFilterItem" value="搜索"/>').on('click', function () {
        function a() {
            var val = $('#txtFilterItem', el).val();
            var m = null;
            var rs = [
                {p: 1, tp: 1}
            ];
            if ((m = /^\/(.+)\/$/.exec(val))) {
                rs = rs.concat(item.filter(function (x) {
                    return x.name.match(m[1]);
                }));
            } else {
                m = '(function(_x){ return true ';
                val.split(' ').forEach(function (v) {
                    m += ' && _x.name.indexOf("' + v.replace('"', "\\\"") + '") > -1 ';
                });
                m += ';})';
                m = eval(m);
                rs = rs.concat(item.filter(m));
            }
            ShowEquipList(rs);
        }

        if (last + 1000 * 60 * 5 < Date.now()) {
            updateItemList().done(a);
        } else {
            a();
        }
    }));
    el.append($('<input type="button" id="btnFilterItemReload" value="重新加载"/>').on('click', function () {
        updateItemList();
    }));
    el.append($('<span></span>').hide());
    var item = [];
    var lock = false;
    var lastDeferred = null;
    var last = 0;

    function updateItemList() {
        if (!lock) {
            last = Date.now();
            lastDeferred = $.Deferred();
            lock = true;
            var i = 1;
            (function k() {
                $.ajax({
                    type: "get",
                    url: "GetEquipList.aspx",
                    data: {
                        "type": '',
                        "mc": '-1',
                        "p": i
                    },
                    cache: false,
                    dataType: "json"
                }).done(function o(data) {
                        if (+data[0].p >= +data[0].tp) {
                            lock = false;
                            lastDeferred.resolve();
                            //     ShowEquipList([{
                            //         p: 1,
                            //         tp: 1
                            // }].concat(item.filter(function(x) {
                            //         return x.name.match(/冠军之剑/) && (x.name.match(/幻像/))
                            //     }).map(function(x) {
                            //         return x.name
                            //     })));
                            $('span', el).hide();
                            return;
                        }
                        $('span', el).text((+data[0].p * 100 / +data[0].tp).toFixed(0) + '%').show();
                        item = item.concat(data.slice(1));
                        setTimeout(function () {
                            $.ajax({
                                type: "get",
                                url: "GetEquipList.aspx",
                                data: {
                                    "type": '',
                                    "mc": '-1',
                                    "p": ++i
                                },
                                cache: false,
                                dataType: "json"
                            }).done(o).fail(k);
                        }, 0);
                    }).fail(k);
            })();
        }
        return lastDeferred;
    }

    $('#equip_type').before(el);
})();