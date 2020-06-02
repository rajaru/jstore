
class bnode {
    constructor(idx, buffer, store){
        this.idx = idx;
        this.ui8 = new Uint8Array(buffer);
        this.store = store;
        this.count = 0;
    }
    get buffer()    {return this.ui8.buffer;}
    get right()     {return this.store._get_uint32(this.ui8, 4);}
    set right(idx)  {this.store._set_uint32(this.ui8, 4, idx);}
    uint8()         {return this.ui8;}
    setUint32(offset, value){this.store._set_uint32(this.ui8, offset, value);}
    getUint32(offset){return this.store._get_uint32(this.ui8, offset);}
}
class leaf extends bnode {}

class bptree{
    constructor(store){
        if(!store)throw Error('Invalid store');
        this.store  = store;
        this.keylen = this.store.keylen;
        // this.keytype= this.store.keytype;
        this.M      = this.store.M;
        this.block  = this.store.block;
        this.reclen = this.keylen + 12;
        this.root = this._load_node(this.store.root());
        this.parents = {[this.root.idx]: -1};
    }

    _new_node(type){
        const buf = new Uint8Array(this.block).fill(0xff);
        buf[0] = type;
        const idx = this.store.write(-1, buf);
        return type == 1 ? new leaf(idx, buf.buffer, this.store) : new bnode(idx, buf.buffer, this.store);
    }

    _new_root_node(key, lnode, rnode){
        const root = this._new_node(2);
        this._set_key_at(root, 16, key, lnode.idx, rnode.idx, true);
        
        this.store.set_root(root.idx);
        this.root = root;
        this.parents[this.root.idx] = -1;
    }

    _load_node(idx, paridx){
        const buf = this.store.read(idx);
        const node = (buf[0]==1) ? new leaf(idx, buf.buffer, this.store) : new bnode(idx, buf.buffer, this.store);
        for(var offset=16; offset<this.block && buf[offset]!=0xff; offset+=this.reclen)node.count = node.count+1;
        if( paridx !== undefined )this.parents[idx] = paridx;
        return node;
    }

    _find_leaf(keyb, root){
        root = root || this.root;
        if( root instanceof leaf )return root;    // located the leaf node
        const uint8 = root.uint8();

        var bf = this._bin_search_closest(uint8, keyb, root.count);
        if( bf != 16+root.count*this.reclen ){
            var idx = root.getUint32(bf +this.keylen);
            return this._find_leaf(keyb, this._load_node(idx, root.idx));
        }

        // var bf = this._bin_search_closest(uint8, keyb, root.count);
        // for(var offset=16; offset<this.block && uint8[offset]!=0xff; offset+=this.reclen){
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) > 0 ){ //drill down the left branch
        //         if( bf != offset )console.log('expected ... ', bf, offset, Buffer.from(keyb).toString() );
        //         var idx = root.getUint32(offset +this.keylen);
        //         return this._find_leaf(keyb, this._load_node(idx, root.idx));
        //     }
        // }
        // if( bf != 16+root.count*this.reclen ){
        //     console.log(this.keytype==0?new DataView(uint8.slice(16, 16+this.keylen)).getFloat64() : Buffer.from(uint8.slice(16, 16+this.keylen)).toString());
        //     console.log(keyb instanceof Uint8Array ? Buffer.from(keyb).toString() : keyb);
        //     console.log('expected: ', 16+root.count*this.reclen, ' got', bf, root.count, offset);
        // }

        // for(var offset=16; offset<this.block && uint8[offset]!=0xff; offset+=this.reclen){
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) > 0 ){ //drill down the left branch
        //         var idx = root.getUint32(offset +this.keylen);
        //         return this._find_leaf(keyb, this._load_node(idx, root.idx));
        //     }
        // }


        return this._find_leaf(keyb, this._load_node(root.right, root.idx));     // must be in the right child
    }

    _save(node){
        this.store.write(node.idx, node.buffer );
        if( this.root.idx == node.idx )this.root = node;
    }

    _add_to_non_leaf_node(pnode, keyb, lnode, rnode){
        const uint8 = pnode.uint8();
        var offset = this._bin_search_closest(uint8, keyb, pnode.count);
        return this._set_key_at(pnode, offset, keyb, lnode.idx, rnode.idx, uint8[offset] == 0xff ); // islast?

        // var bf = this._bin_search_closest(uint8, keyb, pnode.count);
        // for(var offset=16; offset<this.block; offset+=this.reclen)
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) > 0 ){
        //         if( bf != offset )console.log('add non leaf: ', bf, offset);
        //         return this._set_key_at(pnode, offset, keyb, lnode.idx, rnode.idx, uint8[offset] == 0xff ); // islast?
        //     }

        // for(var offset=16; offset<this.block; offset+=this.reclen)
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) > 0 ){
        //         return this._set_key_at(pnode, offset, keyb, lnode.idx, rnode.idx, uint8[offset] == 0xff ); // islast?
        //     }

    }

    _split(node){
        const isleaf = node instanceof leaf;
        const lbuffer= node.uint8();
        const midoff = 16 + Math.ceil(this.M/2) * this.reclen;
        const midkey = lbuffer.slice(midoff, midoff+this.keylen);
        const keyidx = node.getUint32(midoff+this.keylen);

        const rnode = this._new_node(isleaf ? 1 : 2);
        rnode.uint8().set(lbuffer.slice(midoff+ (isleaf?0:(this.reclen) )), 16);    //skip midkey and copy rest for non-leaf

        lbuffer.fill(0xff, midoff);             // clear from (including) midkey onwards. midkey goes to the right (leaf) or up (non-leaf)

        rnode.right = node.right;               // right node's next will point to whatever left was pointing to
        if( !isleaf )node.right = keyidx;       // non-leaf, key will move up and left node's next will point to key's children
        else node.right = rnode.idx;            // leaf node, linked list will point to right node

        this._save(rnode);
        this._save(node);

        if( this.parents[node.idx] == -1 ) this._new_root_node(midkey, node, rnode);
        else this._add_to_non_leaf_node(this._load_node(this.parents[node.idx]), midkey, node, rnode); // add midkey to the parent
    }

    /* non-leaf node: sets key at given offset, makes it point to lnode.
     *   makes the next key (or rightmost if last) point to rnode
     *   takes care of saving and spliting
     */
    _set_key_at(node, offset, keyb, lidx, ridx, islast){
        const uint8 = node.uint8();
        if( !islast )uint8.copyWithin(offset+this.reclen, offset); //make room if its insert (not last)
        uint8.set(keyb, offset);
        node.setUint32(offset+this.keylen, lidx);
        
        if(islast)node.right = ridx;
        else node.setUint32(offset+this.reclen+this.keylen, ridx);

        node.count = node.count + 1;
        this.parents[lidx] = node.idx;
        this.parents[ridx] = node.idx;

        this._save(node);
        if( node.count >= this.M )this._split(node);
    }

    _set_at(node, offset, keyb, value, replace){
        this.store.set_rec(node.uint8(), keyb, value, offset);
        if(!replace)node.count = node.count + 1;
        this._save(node);
        if( node.count >= this.M )this._split(node);
    }

    _add_leaf(node, keyb, value){
        const uint8 = node.uint8();
        for(var offset=16; offset<this.block; offset+=this.reclen){
            var ret = this.store._compare(uint8, offset, keyb, 0, this.keylen);
            if( ret >= 0 ){
                if( ret > 0 && uint8[offset] != 0xff )uint8.copyWithin(offset+this.reclen, offset); // new entry and not overwrite make room
                return this._set_at(node, offset, keyb, value, ret==0 );     // overwrite (ret===0) or insert (ret>0) at offset
            }
        }
        /* istanbul ignore next */
        throw new Error('_add_leaf: could not find free slot');
    }

    put(key, value){
        key = key || 0;
        if( this.store.keytype == 0 && Number(key) != +key ){
            this.store.convert_to_string((keys)=>{
                this.parents = {};
                this.root = this._load_node(this.store.root(), -1);
                // console.log('par:', this.parents);
                for(var key in keys)this.put(key, keys[key]);
            });
        }
        const keyb = this.store.keyb(key, this);
        this._add_leaf(this._find_leaf(keyb), keyb, value);
    }

    _bin_search_closest(ui8, keyb, count){
        let left = 0, right = count;
        let ret = -1;
        while(left <= right ){
            let mid = ((left+right) / 2 >> 0 );
            let cmp = this.store._compare(ui8, 16+mid*this.reclen, keyb, 0, this.keylen);
            if( cmp <= 0 ){
                left = mid + 1;
            }
            else{
                ret = mid;
                right = mid - 1;
            }
        }
        //return ret>=count ? -1 : 16+ret*this.reclen;
        return 16+ret*this.reclen;
    }


    _bin_search_match(ui8, keyb){
        let count = (this.block-16) / this.reclen;
        let left = 0, right = count;
        while(left <= right ){
            let mid = ((left+right) / 2 >> 0 );
            let cmp = this.store._compare(ui8, 16+mid*this.reclen, keyb, 0, this.keylen);
            if( cmp == 0 )return mid;
            if( cmp < 0 ){
                left = mid + 1;
            }
            else{
                right = mid - 1;
            }
        }
        return -1;
    }

    get(key){
        // console.log('get:', key);
        const keyb = this.store.keyb(key);
        const uint8 = this._find_leaf(keyb).uint8();
        const bf = this._bin_search_match(uint8, keyb);
        return bf == -1 ? null : this.store.get_rec(uint8, 16 + bf*this.reclen);


        // const bf = this._bin_search_match(uint8, keyb);
        // for(var offset=16; offset<this.block; offset+=this.reclen){
        //     if( uint8[offset] == 0xff )break;
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) == 0 ){
        //         if( bf != (offset-16)/this.reclen )console.log('** fund ', bf, (offset-16)/this.reclen );
        //         return this.store.get_rec(uint8, offset);
        //     }
        // }
        // if( bf != -1 )console.log('not found ', bf);

        // for(var offset=16; offset<this.block; offset+=this.reclen){
        //     if( uint8[offset] == 0xff )break;
        //     if( this.store._compare(uint8, offset, keyb, 0, this.keylen) == 0 ){
        //         return this.store.get_rec(uint8, offset);
        //     }
        // }
        // return null;
    }

    html(node){
        if( !node )node = this._load_node(this.root.idx);
        var ret = '<table '+ ((node instanceof leaf) ? ('class="leaf" ') : 'class="non-leaf" ') +'>';
        ret += '<tr>';
        for(var i=0, offset=16; i<this.M; i++, offset+=this.reclen){
            var shtml = i<node.count ? Buffer.from(node.buffer, offset, this.keylen).toString() : '-';
            if( !(node instanceof leaf) )shtml += i<node.count ? '<br>|' + this.html(this._load_node(node.getUint32(offset+this.keylen))) : '';
            ret += "<td>"+shtml+"</td>";
        }
        if( !(node instanceof leaf) )ret += "<td>+<br>|"+this.html(this._load_node(node.right))+"</td>";
        ret += '</tr>';
        ret += '</table>\n';
        return ret;
    }

    walk(){
        var ret = [];
        var next = 0;
        do{
            var node = this._load_node(next);
            var ui8 = node.uint8();
            var dv = new DataView(ui8.buffer);
            for(var offset=16; offset<this.block && ui8[offset]!=0xff; offset+=this.reclen )
                if( this.store.keytype == 0 )ret.push(dv.getFloat64(offset));
                else ret.push(Buffer.from(ui8.buffer, offset, this.keylen).toString());
        }while( (next=node.right) != 0xffffffff );
        return ret;
    }
}

module.exports = bptree;