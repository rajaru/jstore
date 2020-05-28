const fastify = require('fastify')();
const path    = require('path');
const jindex  = require('./src/jindex');

const port   = process.env.JS_PORT      || 8080;
const folder = process.env.JS_FOLDER    || 'z:\\temp\\jstrunit';
const pkey   = process.env.JS_PKEY      || 'policy_id';
const maxsize= process.env.JS_MAX_JSON_SIZE  || 5*1024*1024;

fastify.get('/pkey', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    var pkeys = [];
    for(var q in req.query){
        if( q.startsWith('.') ){
            try{pkeys.push(ji.get(q, req.query[q]));}
            catch(e){console.log(e);}
        }
    }
    res.send({ status: 0, data: pkeys });
});
fastify.get('/val', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    var pkeys = [];
    for(var q in req.query){
        if( q.startsWith('.') ){
            try{pkeys.push(ji.get(q, null, req.query[q]));}
            catch(e){console.log(e);}
        }
    }
    res.send({ status: 0, data: pkeys });
});

fastify.get('/walk', async (req, res) => {
    const ji = new jindex(folder, true);    //read mode
    res.send({ status: 0, data: ji.walk(req.query.path, +req.query.primary) });
});

fastify.register(require('fastify-multipart'), {addToBody: true, limits: {fileSize: maxsize, files: 1} });
fastify.post('/index', async (req, res) => {
    const ji = new jindex(folder, false);    //write mode
    if (req.isMultipart()){
        ji.index(req.body.file[0].data.toString(), req.body.pkey || pkey);
    }
    else{
        ji.index(req.body, pkey);
    }
    res.send({ status: 0, data: '' });
});

fastify.register(require('fastify-static'), {root: path.join(__dirname, 'public')});
fastify.listen(port, function (err, addr) {
    if (err) {fastify.log.error(err); process.exit(1);}
    console.log(`jstore listening on ${addr}`);
});
