// const store  = require('./store');
const bptree = require('./bptree');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const keystore = require('./keystore');

const stores = {};
const SUBFOLDERS=1;

class jpathindex{
    constructor(jpath, basepath, reader){
        this.jpath = jpath;

        const shasum = crypto.createHash('sha1');
        const hash = shasum.update(jpath).digest('hex');
        const rhash = hash.substr(0, SUBFOLDERS) + (reader ? 'x' : '');

        if( !stores[rhash] ){
            
            this.idfolder = path.join(basepath, hash.substr(0, SUBFOLDERS));
            if( !fs.existsSync(this.idfolder) ){
                if( reader )throw new Error('jpath '+jpath+' does not exists');
                fs.mkdirSync(this.idfolder, { recursive: true });
                fs.writeFileSync(path.join(this.idfolder, 'paths.json'), '{}');
            }

            const config = path.join(basepath, 'config.json');
            if( !fs.existsSync(config) )
                fs.writeFileSync(config, JSON.stringify({M: +process.env.M||200, keylen: +process.env.JS_KEYLENGTH||16, vallen: +process.env.JS_VALLENGTH||12}));

            const options = JSON.parse(fs.readFileSync(config, 'utf8'));
            stores[rhash] = new keystore({M: options.M, keylen: options.keylen, vallen: options.vallen, basepath: this.idfolder, reader:reader});
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
        if( value ){
            return new bptree(this.st.value).get(value);
        }
        else{
            return new bptree(this.st.primary).get(primarykey);
        }
    }

    values(pkeys, resp, path){
        const bp = new bptree(this.st.primary);
        for(var i=0; i<pkeys.length; i++){
            const pkey = pkeys[i];
            if( !resp.hasOwnProperty(pkey) )resp[pkey] = {};
            resp[pkey][path] = bp.get(pkey);
        }
    }


    walk(primary){
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