const fs     = require('fs');
const path   = require('path');
const cache  = require('./cache');

function _num_compare(buff1, offset1, buff2, offset2, len, dbg){
    if( buff1[offset1] == 0xff )return 1;
    return (new DataView(buff1.buffer).getFloat64(offset1)) - buff2;
}
function _str_compare(buff1, offset1, buff2, offset2, len, dbg){
    for(var i=0; i<len; i++ ){
        if( buff1[i+offset1] < buff2[i+offset2] )return -1;
        else if( buff1[i+offset1] > buff2[i+offset2] )return +1;
    }
    return 0;
}

function _set_uint32(uint8, offset, val){
    uint8[offset+0] = (val >> 24 )&0xff;
    uint8[offset+1] = (val >> 16 )&0xff;
    uint8[offset+2] = (val >>  8 )&0xff;
    uint8[offset+3] = (val >>  0 )&0xff;
}

function _get_uint32(uint8, offset){
    return ((uint8[offset+0]<<24)>>>0) + (uint8[offset+1]<<16) + (uint8[offset+2]<<8) + uint8[offset+3];
}

class store{
    constructor(header, jpath, pstore){
        this.jpath = jpath;
        this.header = header;
        this.pstore = pstore;
        this.keylen = pstore.keylen;
        this.vallen = pstore.vallen;
        this.keytype= this.header.keytype;
        this.M      = pstore.M;
        this.block  = pstore.block;
        this.unique = header.unique;
        this._compare = this.keytype == 0 ? _num_compare : _str_compare;
        
    }

    keyb(key, buf){
        key = key || 0;
        if( this.header.keytype == 0 ){
            return ( Number(key) === +key ) ? +key : 0;
        }
        if(typeof key!=='string')key = ''+key;
        // return Buffer.from((key.toLowerCase()+'                     ').substr(0,this.keylen));              // caseless
        if(key.length<this.keylen)buf.fill(' ', key.length);
        buf.write(key.toLowerCase());
        return buf;
    }

    root(){
        return this.header.root;
    }

    set_root(idx){
        this.pstore._set_root(this.jpath, idx);
    }

    write(at, buffer){
        return this.pstore.write(at, buffer);
    }

    read(at){
        return this.pstore.read(at);
    }

    // record structure
    // ------------key------------ ---type---- ----------value------------
    // kk kk kk kk ... kk kk kk kk tt tt tt tt vv vv vv vv ... vv vv vv vv
    //
    get_rec(ui8, offset){
        let type = _get_uint32(ui8, offset+this.keylen);
        
        if( type==0xffffffff )return _get_uint32(ui8, offset+this.keylen+4);//return dv.getUint32(this.keylen);
        if( type==0xfffffffe )return new DataView(ui8.buffer).getFloat64(offset+this.keylen+4);

        //if( type<=this.vallen )return Buffer.from(ui8.slice(offset+this.keylen+4, offset+this.keylen+4+type)).toString();
        if( type<=this.vallen )return Buffer.from(ui8.subarray(offset+this.keylen+4, offset+this.keylen+4+type)).toString();
        // if( type<=this.vallen )return Buffer.from(ui8, offset+this.keylen+4, type).toString();

        return this.pstore._get_data(_get_uint32(ui8, offset+this.keylen+4), type);
    }

    set_rec(ui8, key, value, offset){
        // console.log('set_rec: ', this.unique?'unique':'', ui8[offset]!=0xff?"append": "", 'key', key instanceof Uint8Array ? Buffer.from(key).toString() : key, 'value', value);
        const append = ui8[offset] != 0xff;
        if( value instanceof Array )value = JSON.stringify(value);
        if( this.keytype == 0 ){
            new DataView(ui8.buffer).setFloat64(offset, key);
        }
        else
            ui8.set(key, offset);

        offset += this.keylen;
        var dv = new DataView(ui8.buffer);

        // case when convert_to_string sends the rest of record as value
        if( value instanceof Uint8Array && value.length==(this.vallen+4) ){
            ui8.set(value, offset);
            return;
        }

        if( !this.unique && append ){
            let varr = [];
            let type = _get_uint32(ui8, offset);
            if( type===0xffffffff )varr.push(_get_uint32(ui8, offset+4));//varr.push(dv.getUint32(offset));
            else if( type===0xfffffffe )varr.push(dv.getFloat64(offset+4));
            else if( type<=this.vallen )varr.push( Buffer.from(ui8.slice(offset+4, offset+4+type)).toString() );
            else{
                let dataptr = _get_uint32(ui8, offset+4);//dv.getUint32(offset);
                let v = this.pstore._get_data(dataptr, type);
                if( v[0] == '[' )varr = JSON.parse(v);
                else varr = [v];
            }

            if( !isNaN(value) ){
                if( varr.indexOf(+value)>=0 )return;
                varr.push(+value);
            }
            else{
                if( varr.indexOf(value)>=0 )return;
                varr.push(value);
            }
            
            value = JSON.stringify(varr);
        }


        if( !isNaN(value) ){
            if( Number.isInteger(+value) ){
                _set_uint32(ui8, offset+4, +value);
                _set_uint32(ui8, offset, 0xffffffff);
            }
            else{
                dv.setFloat64(offset+4, +value);
                _set_uint32(ui8, offset, 0xfffffffe);
            }
        }
        else{
            if(value.length<=this.vallen){
                ui8.set(Buffer.from(value), offset+4);
            }
            else{
                _set_uint32(ui8, offset+4, this.pstore._set_data(value));
            }
            _set_uint32(ui8, offset, value.length);
        }
    }

    convert_block_to_string(idx, keys){
        var ui8 = this.pstore.read(idx);
        var dv = new DataView(ui8.buffer);
        for(var offset=16; offset<this.block; offset+=this.reclen){
            if( ui8[offset] == 0xff )break;
            keys[''+dv.getFloat64(offset)] = ui8.slice(offset+this.keylen, offset+this.keylen+this.vallen+4);
        }
        return _get_uint32(ui8, 4);
    }
    convert_to_string(cb){
        var idx = this.header.first;
        var keys= {};
        do{
            idx = this.convert_block_to_string(idx, keys);
        }while( idx != 0xffffffff );
        this.keytype = 1;
        this._compare = _str_compare;
        this.pstore._set_type(this.jpath, this.keytype);
        cb(keys);
    }
    _set_uint32(ui8, offset, value){
        _set_uint32(ui8, offset, value);
    }
    _get_uint32(ui8, offset){
        return _get_uint32(ui8, offset);
    }

}

class keystore{

    constructor(options){
        this.basepath = options.basepath;
        this.reader   = options.reader;

        if( !fs.existsSync(this.basepath) ){
            if( this.reader )throw new Error('Path not found '+this.basepath);
            fs.mkdirSync(this.basepath, {recursive: true});
        }

        this.pathfile = path.join(this.basepath, 'paths.json');
        if( !fs.existsSync(this.pathfile) ){
            if( this.reader )throw new Error('Paths not found');
            // console.log('paths.json does not exists, creating new ');
            fs.writeFileSync(this.pathfile, '{}');
        }

        // header as json
        this.paths = JSON.parse(fs.readFileSync(this.pathfile));

        // index and data file names
        this.keyfile = path.join(this.basepath, 'key.bin');
        this.datfile = path.join(this.basepath, 'dat.bin');

        // store parameters
        this.keylen = options.keylen || 12;
        this.vallen = options.vallen || 8;      // minimum should be 8
        this.M      = (options.M || 4);
        this.reclen = this.keylen + this.vallen + 4;
        this.block  = 16 + this.M * this.reclen;
        this.ifh    = this._open(this.keyfile);
        this.dfh    = this._open(this.datfile);

        this.dbuf   = Buffer.allocUnsafe(8*1024);
    }

    // open or create the file
    _open(fname){
        var mode = this.reader ? 'r' : 'r+';
        if( !fs.existsSync(fname) ){
            if( this.reader )throw new Error('Key file does not exists');
            mode = 'w+';
        }
        return fs.openSync(fname, mode, fs.constants.O_NONBLOCK);
    }

    _get_store(jpath, unique){
        if( !this.paths[jpath] ){   // create a root node and set that as root
            if(this.reader)return;
            var buf = new Uint8Array(this.block).fill(0xff);
            buf[0] = 1;
            var idx = this.write(-1, buf);
            this.paths[jpath] = {root: idx, first: idx, keytype: 0, unique: unique||0};
            fs.writeFileSync(this.pathfile, JSON.stringify(this.paths));
        }
        return new store(this.paths[jpath], jpath, this);
    }

    _set_root(jpath, root){
        this.paths[jpath].root = root;
        fs.writeFileSync(this.pathfile, JSON.stringify(this.paths));
    }
    _set_type(jpath, type){
        this.paths[jpath].keytype = type;
        fs.writeFileSync(this.pathfile, JSON.stringify(this.paths));
    }

    read(at){
        var ret = cache.get(this.basepath+at);
        if( ret != null )return ret;

        var buf = new Uint8Array(this.block);
        /* istanbul ignore if */
        if( fs.readSync(this.ifh, buf, 0, this.block, (at*this.block)) != this.block)throw Error('Could not read '+this.block+' bytes at '+at);
        cache.set(this.basepath+at, buf);
        return buf;
    }
    write(at, buffer){
        if( at == -1 )at = fs.fstatSync(this.ifh).size / this.block;
        fs.writeSync(this.ifh, Buffer.from(buffer), 0, this.block, (at*this.block));
        cache.set(this.basepath+at, buffer);
        return at;
    }
    _set_data(val){
        var {size} = fs.fstatSync(this.dfh);
        if( size == 0 ){
            fs.writeSync(this.dfh, new Uint8Array(16), 0, 16, size);
            size = 16;
        }
        var vbuf = Buffer.from(val);
        fs.writeSync(this.dfh, vbuf, 0, vbuf.length, size);
        return size;
    }
    _get_data(offset, len){
        if( this.dbuf.length < len )this.dbuf = Buffer.allocUnsafe(len);
        fs.readSync(this.dfh, this.dbuf, 0, len, offset);
        return this.dbuf.toString('utf8', 0, len);
    }
    _close(){
        if( this.ifh )fs.closeSync(this.ifh);
        if( this.dfh )fs.closeSync(this.dfh);
        this.ifh = null;
        this.dfh = null;
    }

    _pack_ratio(){
        const {size} = fs.fstatSync(this.ifh);
        var inuse = 0;
        var data = {};
        
        const ui8 = new Uint8Array(this.block);
        for(var i=0,boff=0; boff<size; boff+=this.block, i+=1){
            fs.readSync(this.ifh, ui8, 0, this.block, boff);
            if( ui8[0]!=1)continue;
            
            data[i] = [];
            for(var offset=16; offset<this.block; offset+=this.reclen){
                var type = _get_uint32(ui8, offset+this.keylen);
                if( type == 0xffffffff || type == 0xfffffffe || type <= this.vallen )continue;
                inuse += type;
                var doffset = _get_uint32(ui8, offset+this.keylen+4);
                data[i].push({doffset: doffset, length: type, ioffset: offset+this.keylen+4});
            }
            if( data[i].length==0 )delete data[i];
        }
        const {size:dsize} = fs.fstatSync(this.dfh);
        return {inuse: inuse, total: dsize, data: data, ratio: 100*inuse/dsize};
    }

    _compact(){
        if( this.reader )return;
        var pack = this._pack_ratio();
        if( pack.ratio<50 ){
            console.log('compacting ', pack.ratio.toFixed(2), '% of ', pack.total);
            const ui8 = new Uint8Array(this.block);
            if( fs.existsSync(this.datfile+'.tmp') )fs.unlinkSync(this.datfile+'.tmp');
            var ofh = fs.openSync(this.datfile+'.tmp', 'w+', fs.constants.O_NONBLOCK);
            fs.writeSync(ofh, ui8, 0, 16, 0);

            for(var idx in pack.data){
                fs.readSync(this.ifh, ui8, 0, this.block, idx*this.block);
                for(var rec of pack.data[idx]){
                    var buf = new Uint8Array(rec.length);
                    fs.readSync(this.dfh, buf, 0, rec.length, rec.doffset);

                    var {size:osize} = fs.fstatSync(ofh);
                    fs.writeSync(ofh, buf, 0, rec.length, osize);
                    _set_uint32(ui8, rec.ioffset, osize); //only pointer changed, length remains the same
                }
                fs.writeSync(this.ifh, ui8, 0, this.block, idx*this.block);
            }
            fs.closeSync(this.dfh);
            fs.closeSync(ofh);
            this.dfh = null;
            fs.unlinkSync(this.datfile);
            fs.renameSync(this.datfile+'.tmp', this.datfile);
            cache.discard();
        }
    }
}

module.exports = keystore;