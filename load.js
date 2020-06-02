/* load test
 * 0x load.js z:\temp\jstrunit z:\data
*/
const fs = require('fs');
const jindex = require('./src/jindex');

const basefolder= process.argv[2];
const datafolder= process.argv[3];

var pids = fs.readdirSync(datafolder).map(x=>x.substr(0, x.indexOf('.')));
var fields=".quote.quote_id,.quote.data.premium_value,.quote.data.first_name,.quote.data.citizenship";

function _object(jpaths, pkeys){
    const resp = {};
    for(var pkey of pkeys )resp[pkey] = {};
    for(var jpath of jpaths){
        try{ji.values(jpath, pkeys, resp);}catch(e){console.log(e)}
    }
    return resp;
}
function _object2(jpaths, pkeys){
    const resp = {};
    for(var pkey of pkeys )resp[pkey] = {};
    for(var jpath of jpaths){
        for(var pkey of pkeys ){
            resp[pkey][jpath] = ji.get(jpath, null, pkey);
        }
    }
    return resp;
}

const ji = new jindex(basefolder, true);    //read mode
const st = new Date().getTime();
var ret = _object(fields.split(','), pids);
// console.log(ret);
console.log('done in ', (new Date().getTime()-st), 'ms');
