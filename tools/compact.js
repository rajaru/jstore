const fs    = require('fs');
const path  = require('path');

function _set_uint32(uint8, offset, val){
    uint8[offset+0] = (val >> 24 )&0xff;
    uint8[offset+1] = (val >> 16 )&0xff;
    uint8[offset+2] = (val >>  8 )&0xff;
    uint8[offset+3] = (val >>  0 )&0xff;
}

function _get_uint32(uint8, offset){
    return ((uint8[offset+0]<<24)>>>0) + (uint8[offset+1]<<16) + (uint8[offset+2]<<8) + uint8[offset+3];
}



const basefolder= process.argv[2];
const options   = JSON.parse(fs.readFileSync(path.join(basefolder, '..', 'config.json')));
const ifh       = fs.openSync(path.join(basefolder, 'key.bin'), 'r+');    //read write
const dfh       = fs.openSync(path.join(basefolder, 'dat.bin'), 'r' );    //read
const ofh       = fs.openSync(path.join(basefolder, 'tmp.bin'), 'w' );    //read
const reclen    = options.keylen + 12;
const block     = 16 + (options.M  * reclen);
const {size}    = fs.fstatSync(ifh);
console.log('M:', options.M, 'keylen:', options.keylen, 'block:', block);
const ui8 = new Uint8Array(block);
for(var boff=0; boff<size; boff+=block){
    fs.readSync(ifh, ui8, 0, block, boff);
    if( ui8[0] != 1 )continue;  //non-leaf node
    var changed = false;
    for(var offset=16; offset<block; offset+=reclen){
        var type = _get_uint32(ui8, offset+options.keylen+8);
        if( type == 0xffffffff || type == 0xfffffffe )continue;
        if( type > 8 && type < 0x0fffffff ){
            var doffset = _get_uint32(ui8, boff+offset+options.keylen);
            
            var buf = new Uint8Array(type);
            fs.readSync(dfh, buf, 0, type, doffset);
            
            var {osize} = fs.fstatSync(ofh);
            fs.writeSync(ofh, buf, 0, type, osize);
            // _set_uint32(ui8, boff+offset+options.keylen, osize);
            // changed = true;
        }
    }
    if( changed ){
        fs.writeFileSync(ifh, ui8, 0, block, boff);
    }
}

fs.closeSync(ifh);
fs.closeSync(ofh);
fs.closeSync(dfh);