# JSTORE
Indexed JSON store
Simple, light-weight, single instance JSON store that indexes every json-path against a primary key and value for faster retrieval of spcific set of json-paths, rather than entire JSON object.
Original JSON objects are not stored and cannot be retrieved, rather specific set of members can be retrieved given primary keys or set of primary keys can be retrieved given values.

Jstore uses B+ Tree to organize indices and stores them into 16 (or 256) files.
Uses Fastify to server requests, can be changed to any other web framework easily (by changing the index.js file)

### Limitations:
- Maximum key length has to be decided ahead of time.
- Periodic compacting is needed as updating values wastes lot of space.
- JSON members with . in their name produces ambiguous output
- Arrays are not fully supported

### Install and Run
Clone from github https://github.com/rajaru/jstore
(Use node version 10.12 or above)
> cd jstore  
npm install  
node index.js  

Key length and value length parameters can be controlled through environment variables (note: these parameters are used only during the first initialization of store folder, not after that)
> export JS_KEYLENGTH=20  
export JS_VALLENGTH=20  
export JS_FOLDER=z:\temp\jstr  
export JS_PORT=8080  
export JS_PKEY=policy_id  
export JS_MAX_JSON_SIZE=5242880  
export M=200  

```
**JS_KEYLENGTH** : Maximum length of keys recognised (rest will be discarded)  
**JS_VALLENGTH**: Maximum length  of value that is stored as part of index file itself (when exceeded, gets stored as part of data file)  
**JS_PORT**: Web (http) server port number  
**JS_PKEY**: Primary key (Every JSON object must have a valid value against this name otherwise will not be indexed)  
**JS_MAX_JSON_SIZE**: Maximum post size  
```

**Unit test** needs nyc to be installed (npm install nyc)  
> nyc --reporter=lcov --reporter=html mocha  

An utility module is available to bulk import JSON objects from folder  
> node tools/bulk.js <store-folder> <primary-key> <data-folder>  

### APIs
jpath: starts with . and every member is seperated by .  
ex: .quote.data.quote_no

**/pkey**  
Method: GET  
Paramters: <jpath1>=<value1>&<jpath2>=<value2>  
Returns: Array of primary keys that match all of above conditions  
Ex:  
http://127.0.0.1:8080/pkey?.quote_id=Q00000001  
```json
{"status":0,"data":["P00000004"]}
```

**/get**  
Method: GET  
Paramters: <jpath1>=<pkey1>&<jpath2>=<pkey2>  
Returns: Object with primary keys as name and values as value  
Ex:  
http://127.0.0.1:8080/val?.quote_id=P00000004
```json
{
    "status": 0,
    "data":{
        "P00000004":"Q00000001"
    }
}
```

**/index**  
Method: POST  
Paramters: JSON Object  
Returns: None  

**/objects**  
Method: POST  
Paramters: <fields>=<jpath1,jpath2,jpath3...>&<pkeys>=<pkey1,pkey2,pkey3>  
Returns: Object with primary key as name and sub object with JSON-Path as name and field value as value  
Ex:  
http://127.0.0.1:8080/objects  
POST data: {"fields":".quote_id,.quote.quote_no","pkeys":"P00000004,P00000005"}  
```javascript
{
    "status":0,
    "data":{
        "P00000004":{
            ".quote_id":"Q00000001",
            ".quote.quote_no":"QUT2020HCB00100001"
        },
        "P00000005":{
            ".quote_id":"Q00000002",
            ".quote.quote_no":"QUT2020HCB00100004"
        }
    }
}
```
