// const store  = require('./store');
const bptree = require('./bptree');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const keystore = require('./keystore');

const stores = {};

class jpathindex{
    constructor(jpath, basepath, reader){
        this.jpath = jpath;
        const shasum = crypto.createHash('sha1');
        const hash = shasum.update(jpath).digest('hex');
        const rhash = hash.substr(0,1) + (reader ? 'x' : '');
        if( !stores[rhash] ){
            this.idfolder = path.join(basepath, hash.substr(0, 1));
            if( !fs.existsSync(this.idfolder) ){
                if( reader )throw new Error('jpath '+jpath+' does not exists');
                //{console.log('jpath', jpath, 'does not exists'); return;}
                fs.mkdirSync(this.idfolder, { recursive: true });
                fs.writeFileSync(path.join(this.idfolder, 'paths.json'), '{}');
            }
            const config = path.join(basepath, 'config.json');
            if( !fs.existsSync(config) )fs.writeFileSync(config, JSON.stringify({M: +process.env.M||200 , keylen: +process.env.KEYLENGTH||16}));
            const options = JSON.parse(fs.readFileSync(config, 'utf8'));
            stores[rhash] = new keystore({M: options.M, keylen: options.keylen, basepath: this.idfolder, reader:reader});
        }
        this.st = {
            primary: stores[rhash]._get_store('primary'+jpath, true),
            value: stores[rhash]._get_store('value'+jpath, false)
        }
        if( !this.st.primary || !this.st.value )throw new Error('failed to create store '+jpath+' : '+hash);
        this.reader = reader;
    }

    put(value, primarykey){
        // console.log('jp:', typeof value, typeof primarykey, value, primarykey )
        new bptree(this.st.value).put(value, primarykey);
        return new bptree(this.st.primary).put(primarykey, value);
    }

    get(value, primarykey){
        // console.log('jp.get:', typeof value, typeof primarykey, value, primarykey );
        // if( !this.st )return null;
        if( value ){
            return new bptree(this.st.value).get(value);
        }
        else{
            return new bptree(this.st.primary).get(primarykey);
        }
    }

    values(pkeys, resp, path){
        // if( !this.st )return null;
        const bp = new bptree(this.st.primary);
        for(var pkey of pkeys ){
            if( !resp.hasOwnProperty(pkey) )resp[pkey] = {};
            resp[pkey][path] = bp.get(pkey);
        }
    }


    walk(primary){
        // if( !this.st )return null;
        return (new bptree(primary ? this.st.primary : this.st.value)).walk();
    }

    static _clean(){
        for(var hash in stores ){
            stores[hash]._close();
            delete stores[hash];
        }
    }

    static _compact(){
        const st = new Date().getTime();
        // close all read-only instances first
        for(var hash in stores){
            if( hash.endsWith('x') ){
                stores[hash]._close();
                delete stores[hash];
            }
        }
        for(var hash in stores){
            stores[hash]._compact();
            stores[hash]._close();
            delete stores[hash];
        }
        console.log('compacted in ', (new Date().getTime()-st), 'ms');
    }
}

module.exports = jpathindex;