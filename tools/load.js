/* load test
 * 0x load.js z:\temp\jstrunit z:\data
 * node load.js z:\temp\jstrunit z:\data
 */
process.env.CACHE_BLOCK_SIZE = 40; //160;
const fs = require('fs');
const jindex = require('../src/jindex');
// const cache = require('../src/cache');

const basefolder= process.argv[2];
const datafolder= process.argv[3];

var pids = fs.readdirSync(datafolder).map(x=>x.substr(0, x.indexOf('.')));
var fields=".quote.quote_id,.quote.data.premium_value,.quote.data.first_name,.quote.data.citizenship";
//var fields=".quote.data.premium_value,.quote.data.first_name,.quote.data.citizenship";

function _object(ji, jpaths, pkeys){
    const resp = {};
    for(var jpath of jpaths){
        try{ji.values(jpath, pkeys, resp);}catch(e){console.log(e)}
    }
    return resp;
}
function _object2(ji, jpaths, pkeys){
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
const flda = fields.split(',').filter(Boolean);
for(var i=0; i<1000; i++){
    var ret = _object(ji, flda, pids);
}
// console.log(ret);
const rescount = Object.keys(ret).length;
console.log('done in ', (new Date().getTime()-st)/i, 'ms', rescount, 'entries', (new Date().getTime()-st)/1000, 's', rescount*i );
// console.log('cache: hit: ', cache.hit, 'miss', cache.miss);
