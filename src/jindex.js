const jpath  = require('./jpathindex');

class jindex{
    constructor(basefolder, reader){
        this.basefolder = basefolder;
        this.jpaths = {};
        this.reader = reader;
    }

    _add_to_index(pkey){
        for(var key in this.jpaths ){
            var jp = new jpath(key.toLowerCase(), this.basefolder);
            jp.put(this.jpaths[key], pkey);
        }
    }

    jpath(node, prefix){
        prefix = prefix || '';
        if( node instanceof Array )
            for(var m of node)this.jpath(m, prefix+'.@');
        else if( typeof node == 'object' )
            for(var n in node){
                if(n.charAt(0)<'0' || n.charAt(0)>'9')this.jpath(node[n], prefix+'.'+n);
            }
        else{
            if( this.jpaths.hasOwnProperty(prefix) ){
                if( !(this.jpaths[prefix] instanceof Array) )this.jpaths[prefix] = [this.jpaths[prefix]]
                this.jpaths[prefix].push(node);
            }
            else{
                this.jpaths[prefix] = node;
            }
        }
    }

    index(json, primarykey){
        if( this.reader )return;
        json = typeof json === 'string' ? JSON.parse(json) : json;
        if( !primarykey || !json[primarykey] )return null;
        this.jpaths = {};
        this.jpath(json, '');
        this._add_to_index(json[primarykey]);
    }

    get(path, value, pkey){
        var jp = new jpath((path||'').toLowerCase(), this.basefolder, this.reader);
        return jp.get(value, pkey);
    }

    values(path, pkeys, resp){
        var jp = new jpath((path||'').toLowerCase(), this.basefolder, this.reader);
        jp.values(pkeys, resp, path);
    }

    
    walk(path, primary){
        var jp = new jpath((path||'').toLowerCase(), this.basefolder, this.reader);
        return jp.walk(primary);
    }

    _clean(){
        jpath._clean();
    }
}

module.exports = jindex;