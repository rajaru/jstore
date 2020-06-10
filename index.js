const fastify = require('fastify')();
const path    = require('path');
const jindex  = require('./src/jindex');
const jpindex = require('./src/jpathindex');
const bptree  = require('./src/bptree');

const port   = process.env.JS_PORT      || 8080;
const folder = process.env.JS_FOLDER    || 'z:\\temp\\jstrunit';
const pkey   = process.env.JS_PKEY      || 'policy_id';
const maxsize= process.env.JS_MAX_JSON_SIZE  || 5*1024*1024;

fastify.setErrorHandler(async (error, req, reply) => {
    console.log(error);
    reply.status(500)
    reply.send()
});

fastify.get('/pkey', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    var pkeys = [];
    for(var q in req.query){
        if( q.startsWith('.') ){
            try{pkeys.push(ji.get(q, req.query[q]));}
            catch(e){console.log(e);}
        }
    }
    res.send({ status: 0, data: _intersect(pkeys)  });
});

function _intersect(arr){
    var res = null;
    for(var a of arr ){
        if( a==null )continue;
        if( !(a instanceof Array) )a = [a];
        if( res == null ){
            res = a.reduce((a, x)=>{a[x]=1; return a;}, {});
        }
        else{
            for(var mem in res )if( a.indexOf(mem)<0 )delete res[mem];
        }
    }
    if( res === null )return [];
    return Object.keys(res);
}

fastify.get('/val', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    var vals = {};
    for(var q in req.query){
        if( q.startsWith('.') ){
            try{vals[req.query[q]] = ji.get(q, null, req.query[q]);}
            catch(e){console.log(e);}
        }
    }
    res.send({ status: 0, data: vals });
});

fastify.get('/walk', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    res.send({ status: 0, data: ji.walk(req.query.path, +req.query.primary) });
});

fastify.post('/objects', async (req, res) => {
    var jpaths=req.body.fields.split(',');
    var pkeys =req.body.pkeys.split(',');
    const ji = new jindex(folder, true);    //read mode
    const resp = {};
    for(var jpath of jpaths){
        try{ji.values(jpath, pkeys, resp);}catch(e){/*console.log(e)*/}
    }
    res.send({ status: 0, data: resp });
});

fastify.post('/csv', async (req, res) => {
    var jpaths=req.body.fields.split(',');
    var pkeys =req.body.pkeys.split(',');
    const ji = new jindex(folder, true);    //read mode
    const ret = pkeys.map((x)=>Array(jpaths.length));
    ret.unshift(jpaths);
    for(var c=0; c<jpaths.length; c++){
        const jp = new jpindex((jpaths[c]||'.').toLowerCase(), ji.basefolder, ji.reader);
        const bp = new bptree(jp.st.primary);
        for(var r=0; r<pkeys.length; r++)ret[r+1][c] = bp.get(pkeys[r]);
    }
    res.send({ status: 0, data: ret });
});

fastify.get('/compact', async (req, res) => {
    jpindex._compact();
    res.send({ status: 0, data: '' });
});

fastify.register(require('fastify-multipart'), {addToBody: true, limits: {fileSize: maxsize, files: 1} });
fastify.post('/index', async (req, res) => {
    const st = new Date().getTime();
    const ji = new jindex(folder, false);    //write mode
    if (req.isMultipart()){
        ji.index(req.body.file[0].data.toString(), req.body.pkey || pkey);
    }
    else{
        ji.index(req.body, pkey);
    }
    res.send({ status: 0, data: '' });
    console.log('Imported ', req.body[pkey], 'in', (new Date().getTime()-st), 'ms');
});

fastify.register(require('fastify-static'), {root: path.join(__dirname, 'public')});
fastify.listen(port, function (err, addr) {
    if (err) {fastify.log.error(err); process.exit(1);}
    console.log(`jstore listening on ${addr}`);
});
