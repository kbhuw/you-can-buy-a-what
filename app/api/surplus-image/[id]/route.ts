import items from '@/data/additional-inventory.json';
const inventory=new Map(items.filter(p=>'surplusId' in p && p.imageUri).map(p=>[String(p.surplusId),p]));
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;
 const item=inventory.get(id);
 if(!item)return new Response('Image not available',{status:404});
 try{
 const response=await fetch('https://www.ppms.gov/gw/common/ppms/api/v1/storage/presigned-urls',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'Mozilla/5.0','Origin':'https://gsaauctions.gov','Referer':'https://gsaauctions.gov/'},body:JSON.stringify([{id,uri:item.imageUri,fileName:item.title.replace(/[^a-zA-Z0-9 ]/g,'')}]),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Image source failed');
 const data=await response.json() as {presignedUrl:string}[];
 const url=new URL(data[0]?.presignedUrl);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.amazonaws.com'))throw new Error('Unexpected image host');
 const image=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!image.ok)throw new Error('Image unavailable');
 const reader=image.body?.getReader();
 if(!reader)throw new Error('Empty image');
 const first=await reader.read();
 const bytes=first.value;
 if(!bytes)throw new Error('Empty image');
 const signature=String.fromCharCode(...bytes.slice(0,12));
 const type=bytes[0]===255&&bytes[1]===216?'image/jpeg':bytes[0]===137&&signature.slice(1,4)==='PNG'?'image/png':signature.startsWith('GIF8')?'image/gif':signature.startsWith('RIFF')&&signature.slice(8,12)==='WEBP'?'image/webp':signature.startsWith('BM')?'image/bmp':null;
 if(!type){await reader.cancel();throw new Error('Invalid image');}
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(bytes);if(first.done)controller.close();},async pull(controller){try{const next=await reader.read();if(next.done)controller.close();else controller.enqueue(next.value);}catch(error){controller.error(error);}},cancel(reason){return reader.cancel(reason);}});
 return new Response(body,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Source photo unavailable',{status:502});}
}
