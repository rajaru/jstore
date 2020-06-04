const fs = require('fs');
const path = require('path');
const jindex = require('./src/jindex');
const jpath = require('./src/jpathindex');

process.env.M = 200;
process.env.KEYLENGTH=16;
process.env.VALLENGTH=16;

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
        var start = new Date().getTime();
        var files = [dirname];
        if( fs.lstatSync(dirname).isDirectory() ){
            files = fs.readdirSync(dirname);
        }
        var ji = new jindex(basefolder);
        console.log(dirname);
        var count=0;
        for(var fname of files ){
            if( !fname.endsWith('.json') )continue;
            try{
                // if( fname != 'P000000000417.json' && fname != 'P000000000428.json' &&
                //     fname != 'P000000000435.json' )continue;
                console.log(count, fname);
                var st = new Date().getTime();
                var json = JSON.parse( fs.readFileSync( path.join(dirname, fname), 'utf8' ));
                if( json instanceof Array )json = json[0];
                ji.index(json, pkey);
                if( count%50 == 0 )jpath._compact();
                console.log('    ', Object.keys(ji.jpaths).length, (new Date().getTime()-st));
            }catch(e){
                console.log(fname, 'indexing json failed', e);
            }
            count += 1;
        }
        console.log('completed in ', (new Date().getTime()-start), 'ms');
    }
}