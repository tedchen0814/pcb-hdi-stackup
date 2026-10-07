const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const server = http.createServer((req,res)=>{
 const pathname = new URL(req.url,'http://localhost').pathname;
 const file = pathname==='/'||pathname==='/index.html'?'index.html':pathname==='/review.md'?'review.md':null;
 if(!file){res.writeHead(404);res.end('Not found');return;}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 fs.createReadStream(path.join(root,file)).pipe(res);
});
server.listen(0,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+server.address().port));
