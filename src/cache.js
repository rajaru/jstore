
class cache{
    constructor(max){
        this.max = max || 4;
        this._init();
    }

    _init(){
        this.head = {prev: null, next: null, data: null, key: 'head'};
        this.tail = {prev: null, next: null, data: null, key: 'tail'};
        this.keys = {};
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.count = 0;
        this.hit = 0;
        this.miss= 0;

    }

    _move_to_head(node){
        if( node.prev == this.head )return; //already at head
        var prev = node.prev;
        prev.next = node.next;              // detach from chain
        node.next.prev = prev;

        node.next = this.head.next;         // link to the head
        this.head.next = node;

        node.prev = this.head;
        node.next.prev = node;              // node next should point to node
    }

    set(key, val){
        if( this.keys.hasOwnProperty(key) ){
            this._move_to_head( this.keys[key] );   // move to head
            this.keys[key].data = val;              // update new value
        }
        else{
            var node = {key: key, data: val, prev: this.head, next: this.head.next};
            this.keys[key] = node;

            this.head.next.prev = node;
            this.head.next = node;
            this.count ++;
            if( this.count > this.max )this._remove_one();
        }
        return val;
    }
    get(key){
        if( !this.keys.hasOwnProperty(key) ){
            this.miss ++;
            return null;
        }
        this._move_to_head( this.keys[key] );       // move to head
        this.hit ++;
        return this.keys[key].data;
    }

    // remove one before tail
    //
    _remove_one(){
        // console.log('removed...', this.count);
        if( this.tail.prev == this.head )return false;    // none found (case can never happen unless count is <=1)
        var node = this.tail.prev;

        this.tail.prev = node.prev;
        node.prev.next = this.tail;
        delete this.keys[node.key];                       // detach and remove from mem
        this.count --;
        return true;
    }
    _keys(){
        var keys = [];
        var node = this.head.next;
        while( node.next ){
            keys.push(node.key);
            node = node.next;
        }
        return keys;
    }

    _print(){
        for(var key in this.keys ){
            console.log(this.keys[key].prev.key, '=>', key, '=>', this.keys[key].next.key);
        }
    }

    discard(){
        this._init();
    }
}

module.exports = new cache(process.env.CACHE_BLOCK_SIZE);   //singleton