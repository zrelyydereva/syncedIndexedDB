# Server-synced IndexedDB Module
　サーバと同期する、IndexedDBです。
　IndexedDB単体としても、少し簡単になってます

* 簡単にテストするには、認証部分取っ払ってください *

## 同期

　DBを開くときに、リモートのURLも渡します。
　syncたたけば、同期されます。

```
var db = null;
var notifier = null; // on('norify')で、画面表示してます。
$kl.syncdb.open('db' + id, "syncdb.php" ,function(err, db) {
    if (err) {
        alert('indexedDBが使えません');
        return;
    }
    db = db;
    db.sync(function(e,r){
        if(notifier) {
            if(r && r.msg){
                notifier.trigger('notify',{key:r.key,message:r.msg});
            }
        }
    });
});
```

## データの入れ方

    id,revを含む好きなオブジェクトを、putに渡してください。
    一部分だけ修正する場合は、
    id,rev,修正したい部分を、setに渡してください。

## データの取り出し方

    キーがわかっている場合は、get(id)でとれます。
    何かしらの検索が行いたい場合は、下記方法で。

```
db.getAsArray({skip:スキップ件数,limit:カウント,order:[desc,それ以外]},function(obj){
    if(obj.xxxx) return false; //
    if(obj.yyyy) return false; //
    if(obj.zzzz) return false; //
        return true;
},function(err,ret){
    //retに入ってます
});

```