const fs    = require('fs');
const path  = require('path');

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
    constructor(options){
        this.reader = options.reader ? true : false;
        this.idx_file = path.join(options.folder, (options.prefix||'primary')+'.idx');
        this.dat_file = path.join(options.folder, (options.prefix||'primary')+'.dat');
        this.fh = null;
        this.header = new Uint8Array(16);
        this._open(this.idx_file, options.M||4, options.keylen||16, options.unique);
        this._open_data(this.dat_file);
    }

    _open(fname, M, keylen, unique){
        if( !fs.existsSync(fname) ){
            if( this.reader )return;
            this.fh = fs.openSync(fname, 'w+', fs.constants.O_NONBLOCK);
            this.header[0] = 71;
            this.header[2] = (0&0x03) | (unique?0x04:0);    //start with number keys
            this.header[3] = keylen;
            //this.header[4] = this.header[5] = this.header[6] = this.header[7] = 0xff;
            this.header[8] = (M>> 0) & 0xff;
            this.header[9] = (M>> 8) & 0xff;
            this.header[10]= (M>>16) & 0xff;
            this.header[11]= (M>>24) & 0xff;
            
            fs.writeSync(this.fh, this.header, 0, 16, 0);

            // first leaf node
            var leaf = new Uint8Array(M*(keylen+12)+16).fill(0xff);
            leaf[0] = 1;
            fs.writeSync(this.fh, leaf, 0, leaf.length, 16);
        }
        else{
            this.fh = fs.openSync(fname, this.reader ? 'r' : 'r+', fs.constants.O_NONBLOCK);
            fs.readSync(this.fh, this.header, 0, this.header.length, 0);
        }
        
        this.rootidx = _get_uint32(this.header, 4); //(new DataView(this.header.buffer)).getUint32(4);
        this.M = ((this.header[11]<<24)>>>0) + (this.header[10]<<16) + (this.header[9]<<8) + this.header[8];
        this.keytype= this.header[2]&0x03;
        this.unique = this.header[2]&0x04;
        this.keylen = this.header[3];
        this.block  = this.M * (this.keylen+12) + 16;
        // console.log('store: M', this.M, 'keylen:', this.keylen, 'block: ', this.block, 'keytype:', this.keytype, 'unique:', this.unique);

        this._compare = this.keytype == 0 ? _num_compare : _str_compare;
    }

    _open_data(fname){
        var header = new Uint8Array(16);
        if( !fs.existsSync(fname) ){
            if( this.reader )return;
            this.dfh = fs.openSync(fname, 'w+', fs.constants.O_NONBLOCK);
            header[0] = 71;
            header[1] = 68;
            fs.writeSync(this.dfh, header, 0, 16, 0);
        }
        else{
            this.dfh = fs.openSync(fname, 'r+', fs.constants.O_NONBLOCK);
            fs.readSync(this.dfh, header, 0, header.length, 0);
        }
    }

    _close(){
        if( this.fh )fs.closeSync(this.fh);
        if( this.dfh )fs.closeSync(this.dfh);
        this.fh = null;
        this.dfh = null;
    }

    size(){
        const {size} = fs.statSync(this.idx_file);
        return size;
    }

    root(){
        return this.rootidx;
        // return new DataView(this.header.buffer).getUint32(4);
    }
    set_root(idx){
        //new DataView(this.header.buffer).setUint32(4, idx);
        _set_uint32(this.header, 4, idx);
        fs.writeSync(this.fh, this.header, 0, 16, 0);
        this.rootidx = idx;
    }

    write(at, buffer){
        if( at == -1 )at = (this.size()-16) / this.block;
        fs.writeSync(this.fh, Buffer.from(buffer), 0, this.block, 16 + (at*this.block));
        return at;
    }

    read(at){
        var buf = new Uint8Array(this.block);
        /*istanbul ignore if*/
        if( fs.readSync(this.fh, buf, 0, this.block, 16 + (at*this.block)) != this.block)
            throw Error('Could not read '+this.block+' bytes at '+at);
        return buf;
    }

    get_rec(ui8, offset){
        var buf = ui8.slice(offset, offset+this.keylen+12);
        var dv = new DataView(buf.buffer);
        //var type=dv.getUint32(this.keylen+8);
        let type = _get_uint32(ui8, offset+this.keylen+8);
        
        if( type==0xffffffff )return _get_uint32(ui8, offset+this.keylen);//return dv.getUint32(this.keylen);
        if( type==0xfffffffe )return dv.getFloat64(this.keylen);
        if( type<=8 )return Buffer.from(buf.slice(this.keylen, this.keylen+type)).toString();

        return this.get_data(_get_uint32(ui8, offset+this.keylen), type);
        //return this.get_data(dv.getUint32(this.keylen), type);
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

        if( value instanceof Uint8Array && value.length==12 ){
            ui8.set(value, offset);
            return;
        }

        if( !this.unique && append ){
            let varr = [];
            //let type = dv.getUint32(offset+8);
            let type = _get_uint32(ui8, offset+8);
            if( type==0xffffffff )varr.push(_get_uint32(ui8, offset));//varr.push(dv.getUint32(offset));
            else if( type==0xfffffffe )varr.push(dv.getFloat64(offset));
            else if( type<=8 )varr.push( Buffer.from(ui8.slice(offset, offset+type)).toString() );
            else{
                let dataptr = _get_uint32(ui8, offset);//dv.getUint32(offset);
                let v = this.get_data(dataptr, type);
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
                //dv.setUint32(offset, +value);
                _set_uint32(ui8, offset, +value);
                // dv.setUint32(offset+8, -1);
                _set_uint32(ui8, offset+8, -1);
            }
            else{
                dv.setFloat64(offset, +value);
                //dv.setUint32(offset+8, -2);
                _set_uint32(ui8, offset+8, -2);
            }
        }
        else{
            if(value.length<=8){
                ui8.set(Buffer.from(value), offset);
            }
            else{
                // let dataptr = dv.getUint32(offset);
                // if( dataptr > 0 && typelen > 8 ){} // we may want to check the existing data to be compact

                // dv.setUint32(offset, this._set_data(value));
                _set_uint32(ui8, offset, this._set_data(value));
            }
            //dv.setUint32(offset+8, value.length);
            _set_uint32(ui8, offset+8, value.length);
        }
    }

    get_data(offset, len){
        var buf = Buffer.from(new ArrayBuffer(len));
        fs.readSync(this.dfh, buf, 0, len, offset);
        return buf.toString();
    }

    _set_data(val){
        // if( typeof val !== 'string' )console.log('val expected tp be string', typeof val, val)
        // store data and return location (cannot be less than 8)
        const {size} = fs.statSync(this.dat_file);
        var vbuf = Buffer.from(val);
        fs.writeSync(this.dfh, vbuf, 0, vbuf.length, size);
        return size;
    }

    convert_to_string(bt){ //walk entire index and convert all the keys to string (left aligned)
        const {size} = fs.statSync(this.idx_file);
        const ui8 = new Uint8Array(this.block);
        const dv  = new DataView(ui8.buffer);
        const reclen = this.keylen+12;
        var recs = [];
        for(var boff=16; boff<size; boff += this.block){
            /*istanbul ignore if*/
            if( fs.readSync(this.fh, ui8, 0, this.block, boff) !== this.block)throw new Error('convert_to_float: corruption detected');
            for(var offset=16; offset<this.block; offset+=reclen){
                if( ui8[offset] == 0xff )break;
                recs.push( {key: dv.getFloat64(offset), ptr: ui8.slice(offset+this.keylen, offset+this.keylen+12)});
            }
        }

        this.keytype = 1;
        this._compare = /*this.keytype == 0 ? _num_compare :*/_str_compare;
        this.header[2] = this.header[2] | this.keytype;
        this.header[4] = this.header[5] = this.header[6] = this.header[7] = 0;  //root index

        fs.ftruncateSync(this.fh, 16);                          // truncate the current file, set root as 0 and re insert all the values
        fs.writeSync(this.fh, this.header, 0, 16, 0);           // change header entries

        var leaf = new Uint8Array(this.block).fill(0xff);
        leaf[0] = 1;
        fs.writeSync(this.fh, leaf, 0, leaf.length, 16);
        this.rootidx = 0;
        bt.parents = {0:-1};
        bt.root = bt._load_node(0);
        for(var rec of recs )bt.put(rec.key, rec.ptr);
        // console.log('   converted ', recs.length, 'entries');
    }

    keyb(key, bt){
        if( this.keytype == 0 ){
            key = key || 0;                         // undefined/null etc coerce to 0
            if( Number(key) === +key )return +key;   // number key
            if( !bt )return 0;
            // console.log('key: ', key, ' is not num converting ',this.idx_file);
            this.convert_to_string(bt);
        }
        if(typeof key!=='string')key = ''+key;
        return Buffer.from((key.toLowerCase()+'                     ').substr(0,this.keylen));              // caseless
    }

    _set_uint32(ui8, offset, value){
        _set_uint32(ui8, offset, value);
    }
    _get_uint32(ui8, offset){
        return _get_uint32(ui8, offset);
    }

}

module.exports = store;