const store  = require('./store');
const bptree = require('./bptree');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const stores = {};

class jpathindex{
    constructor(jpath, basepath, reader){
        this.jpath = jpath;
        const shasum = crypto.createHash('sha1');
        const hash = shasum.update(jpath).digest('hex');
        const rhash = hash + (reader ? 'x' : '');
        if( !stores[rhash] ){
            this.idfolder = path.join(basepath, hash.substr(0, 2), hash);
            if( !fs.existsSync(this.idfolder) ){
                if( reader ){console.log('jpath',jpath, 'does not exists'); return;}
                fs.mkdirSync(this.idfolder, { recursive: true });
            }
            stores[rhash] = {
                primary: new store({M: 4, folder: this.idfolder, prefix: 'primary', unique: true, reader: reader||false}),
                value: new store({M: 4, folder: this.idfolder, prefix: 'value', unique: false, reader: reader||false})
            }
        }
        this.st = stores[rhash];
        this.reader = reader;
    }

    put(value, primarykey){
        // console.log('jp:', typeof value, typeof primarykey, value, primarykey )
        new bptree(this.st.value).put(value, primarykey);
        return new bptree(this.st.primary).put(primarykey, value);
    }

    get(value, primarykey){
        // console.log('jp.get:', typeof value, typeof primarykey, value, primarykey );
        if( !this.st )return null;
        if( value ){
            return new bptree(this.st.value).get(value);
        }
        else{
            return new bptree(this.st.primary).get(primarykey);
        }
    }

    walk(primary){
        return (new bptree(primary ? this.st.primary : this.st.value)).walk();
    }

    static _clean(){
        for(var hash in stores ){
            stores[hash].primary._close();
            stores[hash].value._close();
            delete stores[hash];
        }
    }
}

module.exports = jpathindex;