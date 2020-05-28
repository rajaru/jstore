const fs = require('fs');
const path = require('path');
const jindex = require('./src/jindex');

if( process.argv.length <= 4 ){
    console.log('jstore v1.0.0');
    console.log('node index.js basefolder primarykey [json folder/file]');
}
else{
    const basefolder= process.argv[2];
    const pkey      = process.argv[3];
    const dirname   = process.argv[4];
    if( !fs.existsSync(dirname) ){
        console.log('file/folder ', dirname, 'does not exists');
    }
    else{
        var start = new Date().getUTCMilliseconds();
        var files = [dirname];
        if( fs.lstatSync(dirname).isDirectory() ){
            files = fs.readdirSync(dirname);
        }
        var ji = new jindex(basefolder);
        for(var fname of files ){
            if( !fname.endsWith('.json') )continue;
            try{
                var json = JSON.parse( fs.readFileSync( path.join(dirname, fname), 'utf8' ));
                ji.index(json, pkey);
            }catch(e){
                console.log(fname, 'parsing json failed', e);
            }
        }
        console.log('completed in ', (new Date().getUTCMilliseconds()-start), 'ms');
    }
}