// -------------------------
// 同期するIDB
// 2016.08 @ZrelyyDereva 
// License: MIT
// -------------------------
(function(global) {
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
    var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.msIDBTransaction;
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.msIDBKeyRange;
    var IDBCursor = window.IDBCursor || window.webkitIDBCursor;

    global.$kl.syncdb = {};
    global.$kl.syncdb.open = function(name, remoteUrl, callback) {
        $kl.tryAjax({
            url: remoteUrl,
            json: true,
            method: "POST",
            query: {
                "db": name,
                ver: "?"
            },
            params: []
        }, function(err, ret) {
            if (!ret || !ret.version) {
                //callback("server error");
                //return;
                //callback('net work is offline');
            }
            var idbReq = indexedDB.open(name, 1);
            idbReq.onupgradeneeded = function(event) {
                var db = event.target.result;
                var data = db.createObjectStore(name, {
                    keyPath: "id"
                });
                data.createIndex('index1', 'index1');
                data.createIndex('index2', 'index2');
                data.createIndex('index3', 'index3');
                data.createIndex("tag", "tag", {
                    multiEntry: true
                });
            };
            idbReq.onerror = function(event) {
                callback("indexedDB Error");
            };
            idbReq.onsuccess = function(event) {
                var db = idbReq.result;
                var obj = {
                    _db: db,
                    _remote: remoteUrl,
                    _name: name,
                    _sendToRemote: function(data, callback) {
                        if (!window.navigator.onLine) {
                            callback('we are offline now');
                            return;
                        }
                        $kl.tryAjax({
                            url: this._remote,
                            json: true,
                            method: "POST",
                            query: {
                                "db": this._name,
                                "action": "put"
                            },
                            data: {
                                data: JSON.stringify([{
                                    id: data.id,
                                    rev: data.rev,
                                    data: data
                                }])
                            }
                        }, callback);
                    },
                    put: function(data, callback) {
                        data.id = "" + data.id;
                        var transaction = db.transaction(this._name, "readwrite");
                        var store = transaction.objectStore(this._name);
                        var request = store.put(data);
                        var _this = this;
                        request.onsuccess = function(event) {
                            if (callback) callback(null, ret);
                            setTimeout(function() {
                                _this._sendToRemote(data, function(e) {
                                    console.log(e);
                                })
                            }, 0);
                        }
                        request.onerror = function(event) {
                            if (callback) callback(event);
                        }
                    },
                    set: function(data, callback) {
                        var _this = this;
                        this.get(data.id, function(e, s) {
                            if (e) {
                                return _this.put(data, callback);
                            }
                            for (var k in data) {
                                if (data.hasOwnProperty(k)) {
                                    s[k] = data[k];
                                }
                            }
                            return _this.put(s, callback);
                        })
                    },
                    get: function(key, callback) {
                        var transaction = db.transaction([this._name], "readwrite");
                        var store = transaction.objectStore(this._name);
                        var request = store.get(key);
                        request.onsuccess = function(event) {
                            if (event.target.result === undefined) {
                                // キーが存在しない場合の処理
                                callback('not found')
                            } else {
                                callback(null, event.target.result)
                            }
                        }
                        request.onerror = function(event) {
                            callback('get error');
                        }
                    },
                    each: function(callback) {
                        var transaction = db.transaction([this._name], "readwrite");
                        var store = transaction.objectStore(this._name);
                        var request = store.openCursor();
                        request.onsuccess = function(event) {
                            if (event.target.result == null) {
                                return;
                            }
                            var cursor = event.target.result;
                            var datum = cursor.value;
                            callback(null, datum);
                            cursor.continue();
                        }
                        request.onerror = function(event) {
                            callback('each error');
                        }
                    },
                    getAsArray: function(params, conditions, callback) {
                        var transaction = db.transaction([this._name], "readwrite");
                        var store = transaction.objectStore(this._name);
                        var order = 'next';
                        if (params.order && params.order == "desc") {
                            order = 'prev';
                        }
                        var request = store.openCursor(null, order);
                        var ret = [];
                        var pushed = 0;
                        var skipped = 0;
                        var skip = params.skip | 0;
                        var limit = params.limit | 0;

                        request.onsuccess = function(event) {
                            if (event.target.result == null) {
                                callback(null, ret);
                                return;
                            }
                            if (limit > 0 && pushed >= limit) {
                                callback(null, ret);
                                return;
                            }
                            var cursor = event.target.result;
                            var datum = cursor.value;
                            if (conditions) {
                                if (conditions(datum)) {
                                    if (skip > 0) {
                                        skip--;
                                    } else {
                                        pushed++;
                                        ret.push(datum);
                                    }
                                }
                            } else {
                                if (skip > 0) {
                                    skip--;
                                } else {
                                    pushed++;
                                    ret.push(datum);
                                }
                            }
                            cursor.continue();
                        }
                        request.onerror = function(event) {
                            callback('each error');
                        }
                    },
                    sync: function(callback) {
                        var _this = this;
                        callback(null, {
                            key: 'sync',
                            msg: "同期対象のチェック中"
                        });
                        $kl.tryAjax({
                            url: this._remote,
                            json: true,
                            method: "POST",
                            query: {
                                "db": name,
                                "action": "list"
                            },
                            data: {}
                        }, function(err, ret) {
                            if (err) {
                                callback('listing error');
                                callback(null, {
                                    key: 'sync',
                                    msg: "リスト取得エラー"
                                });
                                return;
                            };
                            if (ret.error) {
                                callback(null, {
                                    key: 'sync',
                                    msg: "リスト取得エラー"
                                });
                                callback('listing error:' + ret.error);
                                return;
                            }
                            var list = ret;
                            var getlist = JSON.parse(JSON.stringify(list));
                            var transaction = db.transaction([_this._name], "readwrite");
                            var store = transaction.objectStore(_this._name);
                            var request = store.openCursor();
                            request.onsuccess = function(event) {
                                //全部終わったときは、リストに残ってるものを取得して保存する
                                if (event.target.result == null) {
                                    var reqs = [];
                                    for (var k in getlist) {
                                        if (k == "") continue;
                                        if (getlist.hasOwnProperty(k)) reqs.push(k);
                                    }
                                    if (reqs.length == 0) {
                                        callback(null, {
                                            key: 'sync',
                                            msg: "更新はありません"
                                        });
                                    } else {
                                        callback(null, {
                                            key: 'sync',
                                            msg: reqs.length + "件の更新を受信します"
                                        });
                                    }
                                    if (reqs.length > 0) $kl.tryAjax({
                                        url: _this._remote,
                                        json: true,
                                        method: "POST",
                                        query: {
                                            "db": _this._name,
                                            "action": "get"
                                        },
                                        data: {
                                            "ids": reqs.join(",")
                                        }
                                    }, function(err, ret) {
                                        if (err) {
                                            callback('retriving error');
                                            return;
                                        }
                                        if (ret.error) {
                                            callback('retriving error:' + ret.error);
                                            return;
                                        }
                                        var compCount = 0;
                                        for (var l in ret) {
                                            ret[l]['rev'] = +ret[l]['rev'];
                                            var request = db.transaction(_this._name, "readwrite")
                                                .objectStore(_this._name).
                                            put(ret[l]['data']);
                                            request.onsuccess = function(e) {
                                                compCount++;
                                                if (compCount == ret.length) {
                                                    callback(null, {
                                                        key: 'put',
                                                        msg: "同期が完了しました"
                                                    });
                                                } else {
                                                    callback(null, {
                                                        key: 'put',
                                                        msg: "更新しました(" + compCount + "件目)"
                                                    });
                                                }
                                            }
                                            request.onerror = function(e) {
                                                compCount++;
                                                if (compCount == ret.length) {
                                                    callback(null, {
                                                        key: 'put',
                                                        msg: "同期が完了しました"
                                                    });
                                                } else {
                                                    callback(null, {
                                                        key: 'put',
                                                        msg: "更新に失敗しました(" + compCount + "件目)"
                                                    });
                                                }
                                                //callback("sync store error");
                                            }
                                        }

                                        callback(null, "alldone");
                                    });
                                    return;
                                }
                                var cursor = event.target.result;
                                var datum = cursor.value;
                                if (!ret[datum.id]) {
                                    //サーバが持ってないものがあった
                                    _this._sendToRemote(datum, function(e, ret) {
                                        //callback(null, "send to server" + datum.id);
                                        if (e) {
                                            callback(null, {
                                                key: 'send' + datum.id,
                                                msg: "サーバに登録できませんでした"
                                            });
                                        } else {
                                            callback(null, {
                                                key: 'send' + datum.id,
                                                msg: "サーバにローカルデータを登録しました"
                                            });
                                        }
                                    })
                                } else {
                                    if (ret[datum.id] < datum.rev) {
                                        //サーバのほうが古い
                                        _this._sendToRemote(datum, function(e, ret) {
                                            if (e) {
                                                callback(null, {
                                                    key: 'send' + datum.id,
                                                    msg: "サーバの情報を更新できませんでした"
                                                });
                                            } else {
                                                callback(null, {
                                                    key: 'send' + datum.id,
                                                    msg: "サーバの情報を更新しました"
                                                });
                                            }
                                        });
                                        delete getlist[datum.id];
                                    } else if (ret[datum.id] == datum.rev) {
                                        //ローカルと同じリビジョン
                                        delete getlist[datum.id];
                                    }
                                }
                                //callback(null, datum);
                                cursor.continue();
                            }
                            request.onerror = function(event) {
                                callback('each error');
                            }

                        });
                    }
                };
                callback(null, obj);
            };
        })
    }

})((this || 0).self || global);