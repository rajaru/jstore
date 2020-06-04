const fs    = require('fs');
const path  = require('path');
const keystore = require('../src/keystore');
const bptree= require('../src/bptree');
const jindex= require('../src/jindex');
const jpath = require('../src/jpathindex');
const cache = require('../src/cache');
const assert = require( "assert" );


process.env.M = 4;

const basepath="z:\\temp\\jstrunit";
const bpidxfile=path.join(basepath, 'primary.idx');
const bpdatfile=path.join(basepath, 'primary.dat');
const bpnumidxfile=path.join(basepath, 'numeric.idx');
const bpnumdatfile=path.join(basepath, 'numeric.dat');

async function wait(ms){
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve();
        }, ms);
    });
}

var keyst   = null;
var st      = null;
var nst     = null;
before(()=>{
    if( fs.existsSync(basepath) )fs.rmdirSync(basepath, {recursive: true});
    wait(1000);
    if( !fs.existsSync(basepath) )fs.mkdirSync(basepath, {recursive: true});
    if( fs.existsSync(bpidxfile) )fs.unlinkSync(bpidxfile);
    if( fs.existsSync(bpdatfile) )fs.unlinkSync(bpdatfile);
    if( fs.existsSync(bpnumidxfile) )fs.unlinkSync(bpnumidxfile);
    if( fs.existsSync(bpnumdatfile) )fs.unlinkSync(bpnumdatfile);

    // create a new store with unique index
    // keyst = new keystore({M:4, keylen: 16, basepath: basepath});
    // st = keyst._get_store('primary', true); // new store({folder: basepath, unique: true});
    // nst = keyst._get_store('value', false); // new store({M: 4, folder: basepath, prefix: 'numeric', unique: true});
});

describe("cache test", ()=>{
    it("remove_one from empty", ()=>{
        assert( !cache._remove_one(), 'Expected false');
    });
    it("add", ()=>{
        assert( cache.set("1", "One") == "One", "Set failed");
    });
    it("read", ()=>{
        assert( cache.get("1") == "One", "get failed");
    });
    it("add existing", ()=>{
        assert( cache.set("1", "One-1") == "One-1", "Update failed");
    });
    it("read-fail", ()=>{
        assert( cache.get("2") == null, "get must fail");
    });
    it("add 2", ()=>{
        assert( cache.set("2", "Two") == "Two", "Second add failed");
    });
    it("read-one (move to head)", ()=>{
        assert( cache.get("1") == "One-1", "get one failed");
    });
    it("key order", ()=>{
        var ret = JSON.stringify(cache._keys());
        var exp = '["1","2"]';
        assert( JSON.stringify(cache._keys()) == '["1","2"]', "Key order failed expected "+exp+" found "+ret);
    });
    it("add 3", ()=>{
        assert( cache.set("3", "Three") == "Three", "3 add failed");
    });
    it("add 4", ()=>{
        assert( cache.set("4", "Four") == "Four", "4 add failed");
    });
    it("add 5", ()=>{
        assert( cache.set("5", "Five") == "Five", "5 add failed");
    });
    it("keys truncated", ()=>{
        var ret = JSON.stringify(cache._keys());
        var exp = '["5","4","3","1"]';
        assert( ret == exp, "Key order failed expected "+exp+" found "+ret);
    });
    it("keys print", ()=>{
        cache._print();
    });
    it("repeated read", ()=>{
        assert( cache.get("3") == "Three", "get 3 failed");
        assert( cache.get("3") == "Three", "get 3 failed");
        assert( cache.get("3") == "Three", "get 3 failed");
    });

});

describe( "setup basepath", () => {
    it('create keystore', ()=>{
        keyst = new keystore({M:4, keylen: 16, vallen: 12, basepath: basepath});
        st = keyst._get_store('primary', true); // new store({folder: basepath, unique: true});
        nst = keyst._get_store('value', false); // new store({M: 4, folder: basepath, prefix: 'numeric', unique: true});    
    });
});

describe( "b+ tree", () => {
    it("add", ()=>{
        var bp = new bptree(st);
        bp.put("a", "Hello");
        bp.put("b", "Hello");
        bp.put("c", "Welcome");
        var ret = bp.get("a");
        assert( ret == "Hello", "Expected Hello, found "+ret );
        assert(bp.get("A") == "Hello", "Expected Hello for caps A");
        assert(bp.get("CC") == null, "Non-Existent key");
    });
    it("overwrite", ()=>{
        var bp = new bptree(st);
        bp.put("a", "Yello");
        assert( bp.get("a") == "Yello", "Expected Yello, found ..." );
    });
    it("insert", ()=>{
        var bp = new bptree(st);
        bp.put("a0", "Yello");
        assert( bp.get("a0") == "Yello", "Expected Yello, found ..." );
    });

    it("split leaf", ()=>{
        var bp = new bptree(st);
        bp.put("d", "Split");
        assert(bp.get("D") == "Split", "Expected Hello for caps A");
    });
    it("split non leaf", ()=>{
        var bp = new bptree(st);
        for(var i=0; i<6; i++ )bp.put("b"+i, "nSplit");
        assert(bp.get("b0") == "nSplit", "Expected Hello for caps b0");
    });
    it("split non leaf - right", ()=>{
        var bp = new bptree(st);
        for(var i=0; i<6; i++ )bp.put("d"+i, "rSplit");
        assert(bp.get("d0") == "rSplit", "Expected Hello for caps b0");
    });
    it("split non leaf - deep", ()=>{
        var bp = new bptree(st);
        for(var i=0; i<16; i++ )bp.put("e"+i, "rSplit");
        assert(bp.get("e0") == "rSplit", "Expected Hello for caps b0");
    });
    it("html", ()=>{
        var bp = new bptree(st);
        var html = '<!DOCTYPE html><html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type"><meta content="utf-8" http-equiv="encoding"><link rel="stylesheet" type="text/css" href="jstr.css"></head><body>';
        fs.writeFileSync(path.join(basepath, 'unit.html'), html+bp.html()+'</body></html>');
    });
    it("walk", ()=>{
        var bp = new bptree(st);
        var ret = bp.walk();
        assert(ret.length==33, 'Expected 33 elements in B+Tree, found '+ret.length);
    });

    it("reopen", ()=>{
        keyst._close();
        keyst._close();    //redundant should not fail
        keyst = new keystore({M:4, keylen: 16, vallen: 12, basepath: basepath});
        st = keyst._get_store('primary', true); // new store({folder: basepath, unique: true});
        nst = keyst._get_store('value', false); // new store({M: 4, folder: basepath, prefix: 'numeric', unique: true});
    
        // st._close();
        // st._close();    //redundant should not fail
        // st = new store({M: 4, folder: basepath, prefix: 'primary', unique: true});
        var bp = new bptree(st);
        var ret = bp.walk();
        assert(ret.length==33, 'Expected 33 elements in B+Tree, found '+ret.length);
    });

    it('readonly', async ()=>{
        fs.rmdirSync(basepath+'x', {recursive: true});
        fs.rmdirSync(basepath+'y', {recursive: true});
        await wait(800)
        var nst = null;
        assert.throws( ()=>{nst = new keystore({M: 4, basepath: basepath+'x', unique: true, reader: true})}, Error, 'Expected exception');
        
        if(!fs.existsSync(basepath+'y'))fs.mkdirSync(basepath+'y');
        assert.throws( ()=>{nst = new keystore({M: 4, basepath: basepath+'y', unique: true, reader: true})}, Error, 'Expected exception');

        fs.writeFileSync(path.join(basepath+'y', 'paths.json'), '{}');
        assert.throws( ()=>{nst = new keystore({M: 4, basepath: basepath+'y', unique: true, reader: true})}, Error, 'Expected exception');
        // assert.throws( ()=>{var sst = nst._get_store('test', true);}, Error, 'Expected exception');

        // var rst = nst._get_store('rtest', true);
        assert( !fs.existsSync(path.join(basepath, 'rtest.bin') ), "rtest.bin must not exists" );
        assert( !fs.existsSync(path.join(basepath, 'rtest.dat') ), "rtest.dat must not exists" );
        
    });

    it('readonly-compact', async ()=>{
        fs.rmdirSync(basepath+'z', {recursive: true});
        
        var nst = new keystore({basepath: basepath+'z', unique: true});
        await wait(500);
        nst._close();

        var ji = new jindex(basepath+'z', true);
        assert.throws( ()=>{ji.get('.b.c.d', 'Test')}, Error, "Expected exception");

        await wait(500);
        var nst = new keystore({basepath: basepath+'z', unique: true, reader: true});
        nst._compact();
    });

    it('multikey', ()=>{
        var ast = keyst._get_store('another', true);
        var bp = new bptree(ast);
        bp.put('a', 'Test');
        assert(bp.get('a')=='Test', 'Expected Test');
    });
    
    it('error-test', ()=>{
        assert.throws( ()=>{new bptree(null)}, Error, "should fail");
    });

    it('param-test', ()=>{
        var bp = new bptree(st);
        bp.put("", "Hello");
        bp.put(undefined, "Hello");
        bp.put(null, "Hello");
        assert(bp.get('')=='Hello', 'Expected Hello, found '+bp.get(''));
    });

});

describe( "b+ tree numeric", () => {
    it("add", ()=>{
        var bp = new bptree(nst);
        bp.put("1", "710");
        bp.put("2", "900.2");
        bp.put("3", "Welcome");
        assert( bp.get("1") == "710", "Expected 710, found " );
        assert( bp.get("2") == "900.2", "Expected 900.2, found " );
    });
    it("longer data", ()=>{
        var bp = new bptree(nst);
        bp.put("10", "This is longer than 8");
        assert( bp.get("10") == "This is longer than 8", "Expected 'This is longer than 8', found " );
    });
    it("get with string key", ()=>{
        var bp = new bptree(nst);
        assert( bp.get("a10") == null, "Expected '0', found " );
    });
    it("get with empty string key", ()=>{
        var bp = new bptree(nst);
        assert( bp.get("") == null, "Expected '0', found " );
    });

    it("convert to string", ()=>{
        var bp = new bptree(nst);
        bp.put("a10", "This");
        assert( bp.get("a10") == "This", "Expected 'This', found " );
    });

});

var filters = [];//['d.json', 'e.json'];
function test_json(ji, file){
    if( fs.existsSync(file) ){
        var test = JSON.parse(fs.readFileSync(file, 'utf8'));
        for(var k in test ){
            for(var pkey in test[k]){
                var ret = ji.get(k, null, pkey);
                assert( ret == test[k][pkey], "Failed -"+file+":"+k+" expected "+test[k][pkey]+" found "+ret);
            }                    
        }    
    }
}
function add_json(file){
    it("json file "+file, ()=>{
        var ji = new jindex(basepath);
        if( file.endsWith('.json') ){
            var json = fs.readFileSync(path.join('./test/data', file), 'utf8');
            ji.index(json, 'key');
            test_json(ji, path.join('./test/data', file.substr(0, file.length-4)+'txt'));
        }
    });
}


describe( "json index", () => {
    fs.readdirSync('./test/data').forEach(file => {
        if( filters.length>0 && filters.indexOf(file)<0 )return;
        add_json(file);
    });
    
    it("clean", ()=>{
        var ji = new jindex(basepath);
        ji._clean();
    });
    it("read ", ()=>{
        var ji = new jindex(basepath);
        fs.readdirSync('./test/data').forEach(file => {
            if( file.endsWith('.txt') ){
                var test = JSON.parse(fs.readFileSync(path.join('./test/data', file), 'utf8'));
                test_json(ji, test);
            }
        });
    });
    
    it("non-unique ", ()=>{
        var ji = new jindex(basepath);
        var ret = ji.get('.quote_id', 'Q001');
        assert(ret=="P001", "Expected single key P001, found ", ret)

        var ret = ji.get('.producer', 'a broker');
        assert(ret=="[\"P001\",\"P002\"]", "Expected two key P001,P002")

        var ret = ji.get('.premium', '100.1');
        assert(ret=="[\"P001\",\"P00000003\"]", "Expected two key P001,P00000003, got", ret)
    });
    fs.readdirSync('./test/data').forEach(file => {
        if( filters.length>0 && filters.indexOf(file)<0 )return;
        add_json(file);
    });
    it("read-again ", ()=>{
        var ji = new jindex(basepath, true);
        var ret = ji.get('.quote_id', 'Q001');
        assert(ret=="P001", "Expected single key P001, found ", ret);

        var ret = ji.get('.producer', 'a broker');
        assert(ret=="[\"P001\",\"P002\"]", "Expected two key P001,P002 found "+ret)

        var ret = ji.get('.premium', '100.1');
        assert(ret=="[\"P001\",\"P00000003\"]", "Expected two key P001,P00000003, got", ret)

        assert.throws( ()=>{ji.get('.random', '100.1')}, Error, 'Expected error');
        ji.index({'.random': 'hello'});
    });
    it("Empty path ", ()=>{
        var ji = new jindex(basepath, true);
        var ret = ji.get('', 'Empty');
        assert(ret=="P001", "Expected single key P001, found ", ret);
        var resp = {};
        ji.values(undefined, ['P001'], resp);
        assert(resp['P001']['.'] == 'Empty', 'Expected Empty got '+JSON.stringify(resp));

        ji.walk(undefined);
    });

    it('long key', ()=>{
        var ji = new jindex(basepath, true);
        var ret = ji.get('.large', 'long repeat value more than 20');
        assert(ret=="[\"P001\",\"P002\"]", "Expected two key P001,P002 found "+ret)
        var ret = ji.get('.large2', 'long repeat value more than 19');  //works like a prefix
        assert(ret=="[\"P001\",\"P002\"]", "Expected two key P001,P002 found "+ret)
    })


    it("read-object ", ()=>{
        var ji = new jindex(basepath, true);
        var resp =  {};
        ji.values('.quote_id', ['P00000003','P001'], resp);
        ji.values('.age', ['P00000003','P001'], resp);
        assert( resp['P00000003']['.quote_id'] == 'Q003');
        assert( resp['P001']['.quote_id'] == 'Q001');
        // console.log(resp);
    });

    it("json walk ", ()=>{
        var ji = new jindex(basepath);
        ji.walk('.a');
        ji.walk('.a', true);
    });
    it("mandatory ", ()=>{
        var ji = new jindex(basepath);
        assert(ji.index({test: 'Test'})==null, "Allows non-primary key index");
    });
});

describe( "manage store", () => {
    it("compact ", ()=>{
        jpath._compact();
    });
    it("read-after-compact ", ()=>{
        var ji = new jindex(basepath, true);
        var ret = ji.get('.quote_id', 'Q001');
        assert(ret=="P001", "Expected single key P001, found ", ret);

        var ret = ji.get('.producer', 'a broker');
        assert(ret=="[\"P001\",\"P002\"]", "Expected two key P001,P002")

        var ret = ji.get('.premium', '100.1');
        assert(ret=="[\"P001\",\"P00000003\"]", "Expected two key P001,P00000003, got", ret)

        assert.throws( ()=>{ji.get('.random', '100.1')}, Error, 'Expected exception');
        
        var ret = ji.index({random: 'hello'});
        assert(ret==null, "Expected null, got", ret)
    });

});
