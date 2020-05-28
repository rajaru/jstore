const jindex = require('../src/jindex');
/*
if( fs.existsSync('z:\\temp\\jstr.idx') )
    fs.unlinkSync('z:\\temp\\jstr.idx');
if( fs.existsSync('z:\\temp\\jstr2.idx') )
    fs.unlinkSync('z:\\temp\\jstr2.idx');

var st = new store({folder: 'z:\\temp', M: 4, keylen: 12});

var bt = new btree(st);
bt.put('a', 'there');
bt.put('B', 'there');

bt.put('c', 'there');
bt.put('d', 'there');
bt.put('e', 'there');
bt.put('f', 'there');
bt.put('g', 'there');
bt.put('h', 'there');

bt.put('da', 'there');
bt.put('db', 'there');
bt.put('dc', 'there');
bt.put('dd', 'there');
bt.put('de', 'there');
bt.put('df', 'there');
bt.put('d0', 'there');
bt.put('d1', 'there');
bt.put('d2', 'there');
bt.put('a0', 'there');
bt.put('f1', 'there');

var html = '<!DOCTYPE html><html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type"><meta content="utf-8" http-equiv="encoding"><link rel="stylesheet" type="text/css" href="jstr.css"></head><body>';
fs.writeFileSync('z:\\temp\\jstr.html', html+bt.html()+'</body></html>');

bt.walk();
*/
/*
var ji = new jindex('policyid', 'Z:\\temp\\jstr');
ji.put('P0001', 'Test1');
ji.put('P0002', '100');
ji.put('P0003', '101.22');
console.log('P0001', ji.get('P0001'));
console.log('P0002', ji.get('P0002'));
console.log('P0003', ji.get('P0003'));
*/
/*
var json = {
    policy_id: 'p00001',
    quote: {
        quote_id: 'Q0001',
        data: {
            broker_name: 'Hello there my name',
            premium_value: 100
        }
    }
};
var ji = new jindex('policy_id');
ji.index(json, json['policy_id']);
*/
/*
var st = new store({M: 4, folder: "z:\\temp\\jstr", prefix: 'primary', unique: true});
var bt = new bptree(st);
bt.put("1", "P0001");
bt.put("a2.", "P0002");
bt.put("2.7", "P0003");
bt.put("1.2", "P0003");
var html = '<!DOCTYPE html><html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type"><meta content="utf-8" http-equiv="encoding"><link rel="stylesheet" type="text/css" href="jstr.css"></head><body>';
fs.writeFileSync('z:\\temp\\jstr.html', html+bt.html()+'</body></html>');
*/
/*
if( fs.existsSync('z:\\temp\\jstr\\primary.idx') )fs.unlinkSync('z:\\temp\\jstr\\primary.idx');
var st = new store({M: 4, folder: "z:\\temp\\jstr", prefix: 'primary', unique: false});
var bt = new bptree(st);
bt.put("b1",  "100");
bt.put("b1", "120");
var html = '<!DOCTYPE html><html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type"><meta content="utf-8" http-equiv="encoding"><link rel="stylesheet" type="text/css" href="jstr.css"></head><body>';
fs.writeFileSync('z:\\temp\\jstr.html', html+bt.html()+'</body></html>');
console.log(bt.get("b1"));
*/

// var ji = new jindex('z:\\temp\\jstrunit');
// var ret = ji.get('.a', '1');
// console.log(ret);
