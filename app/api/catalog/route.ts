import {assemble,initialCatalog,type Auction,type Catalog} from '@/lib/catalog';
let cached:Catalog|null=null;
let pending:Promise<Catalog>|null=null;
async function listings(filter:string):Promise<Auction[]>{
 const output:Auction[]=[];let page=1,total=0,pages=1;
 do{
 const response=await fetch('https://realestatesales.gov/our-listing/',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({perpage:'48',page:String(page),listing_filter:filter,sort_column:'auction_start_date_asc'}).toString(),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Auction source returned '+response.status);
 const data=await response.json() as {error:number;property_list:Auction[];total:number;no_page:number};
 if(data.error!==0||!Array.isArray(data.property_list))throw new Error('Auction source response was invalid');
 total=data.total;pages=data.no_page;output.push(...data.property_list);page++;
 if(page>500)throw new Error('Auction pagination exceeded safe request limit');
 }while(page<=pages);
 if(output.length!==total)throw new Error('Incomplete auction source response');
 return output;
}
export async function GET(){
 if(cached&&Date.now()-Date.parse(cached.checkedAt)<60000)return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
 try{
 if(!pending)pending=Promise.all([listings('all_listing'),listings('closed_listing')]).then(([open,closed])=>{const rows=[...new Map([...closed,...open].map(p=>[p.id,p])).values()];return assemble(rows,new Date().toISOString(),true);});
 cached=await pending;
 return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({...cached??initialCatalog,live:false,error:'Live bid refresh failed. Showing the last verified amounts and their timestamps.'},{headers:{'Cache-Control':'no-store'}});}
 finally{pending=null;}
}
