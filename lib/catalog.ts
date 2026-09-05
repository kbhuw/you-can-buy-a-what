import additional from '@/data/additional-inventory.json';
import inventoryCoverage from '@/data/inventory-coverage.json';
import disposition from '@/data/disposition.json';
import disposal from '@/data/disposal-search.json';
import details from '@/data/auction-details.json';
import disposalDetails from '@/data/disposal-details.json';
import snapshot from '@/data/auction-snapshot.json';
export type Property={agency?:string;imageUri?:string;surplusId?:number;id:string;title:string;location:string;address:string;category:string;spec:string;status:string;price:number|null;priceLabel:string;image:string;disclaimer:string;description:string;source:string;documents:{title:string;url:string}[];sourceKeys:string[];auctionId?:number;bidCount?:number;checkedAt:string;bidEnd?:string;tag?:string};
export type Auction=typeof snapshot.properties[number];
export type Catalog={properties:Property[];checkedAt:string;live:boolean;error?:string;inventoryCoverage:typeof inventoryCoverage;coverage:{auction:number;disposition:number;disposal:number;lighthouse:number}};
const checkedAt=snapshot.checkedAt;
const aliases:Record<string,number>={'gsa-6':67,'gsa-7':68,'gsa-17':54,'gsa-24':53,'gsa-34':43,'gsa-45':11,'gsa-46':13};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function assemble(auctions:Auction[],at:string,live:boolean):Catalog{
 const entries:Property[]=auctions.map(a=>{
 const d=(details as Record<string,{description:string;deposit:string;documents:{title:string;url:string}[]}>)[a.id];
 const active=a.status==='Active',pending=a.status==='Pending';
 const current=Number(a.property_current_price),opening=Number(a.property_price);
 const price=current>0?current:active&&opening>0?opening:null;
 const priceLabel=current>0?(active?'Current bid':'High bid at close'):active&&opening>0?'Starting bid':pending?'Bidding not open':'Bid not published';
 const title=a.property_name||a.address_one;
 const category=/lighthouse|range light/i.test(title)?'Lighthouses':/garage/i.test(title)?'Garages':/courthouse|jail/i.test(title)?'Courthouses':a.property_asset==='Residential'||a.id===41?'Homes':a.property_asset==='Land/Lots'?'Land & farms':a.property_asset==='Industrial'?'Warehouses':a.property_asset==='Commercial'?'Federal buildings':'Other';
 const disclaimer=active?`${d?.deposit?`${d.deposit} bid deposit required. `:''}Reserve auction; GSA may reject bids. Review the property’s Invitation for Bids before bidding.`:pending?'Bidding has not opened. Sale dates, deposits and property restrictions are governed by the official sale documents.':`Auction closed. ${current>0?'The high bid is not a confirmed final sale price. ':''}${a.closing_status_name==='Pending Review'?'Award is pending review. ':''}This listing is kept for reference.`;
 return {id:'auction-'+a.id,auctionId:a.id,title,location:`${a.city}, ${a.state_name}`,address:a.name,category,spec:a.property_asset+' · '+a.auction_type,status:active?'Bidding open':pending?'Coming soon':'Auction closed',price,priceLabel,image:a.property_image?.image?'https://d2m3yrz4x1yefr.cloudfront.net/'+a.property_image.bucket_name+'/'+encodeURIComponent(a.property_image.image):'',disclaimer,description:d?.description||`${title} at ${a.name}. See the official property documents for the complete description and conditions.`,source:`https://realestatesales.gov/asset-details/?property_id=${a.id}`,documents:d?.documents.map(doc=>({...doc}))||[],sourceKeys:['auction:'+a.id],bidCount:a.bidder_offer_count,checkedAt:at,bidEnd:a.bidding_end||undefined};
 });
 for(const d of disposition){
 const match=aliases[d.id]===undefined?undefined:entries.find(p=>p.auctionId===aliases[d.id]);
 if(match){match.sourceKeys.push('accelerated:'+d.id);match.spec=d.spec;if(d.image&&!/AI/i.test(d.image))match.image=d.image;continue;}
 entries.push({...d,sourceKeys:['accelerated:'+d.id],checkedAt} as Property);
 }
 for(const s of disposal){
 const match=entries.find(p=>('auctionId' in s&&p.auctionId===s.auctionId)||('dispositionId' in s&&p.sourceKeys.includes('accelerated:'+s.dispositionId)));
 if(match){match.sourceKeys.push('disposal:'+s.id);match.documents.push({title:'GSA disposal record',url:'https://disposal.gsa.gov/s/property/'+s.id});continue;}
 if(!s.title)throw new Error('Unmatched disposal source: '+s.id);
 entries.push({id:'disposal-'+s.id,title:s.title,location:s.location!,address:s.location!,category:s.category!,spec:s.category!,status:s.id==='a0X3d000001PtKYEA0'?'Removal opportunity':'Disposal listed',price:null,priceLabel:'Price not published',image:s.image!,disclaimer:s.id==='a0X3d000001PtKYEA0'?'This is an offsite removal opportunity. Do not assume the land is included; review the RFI and RFP requirements.':'Listed by GSA. Public bidding and a price are not confirmed; check the property documents for eligibility and conditions.',description:`${s.title} at ${s.location}. Listed in GSA’s Current Sales and Business Opportunities catalog.`,source:'https://disposal.gsa.gov/s/property/'+s.id,documents:[],sourceKeys:['disposal:'+s.id],checkedAt,...((disposalDetails as Record<string,Partial<Property>>)[s.id]||{})});
 }
 entries.push({id:'boston-light',title:'Boston Light & Little Brewster Island',location:'Boston, Massachusetts',address:'Little Brewster Island, Boston Harbor, MA',category:'Lighthouses',spec:'Island · 6 structures · Historic lighthouse',status:'Eligible-entity transfer',price:0,priceLabel:'Acquisition cost',image:'https://www.gsa.gov/system/files/Boston%20Ligh.jpeg',disclaimer:'Only eligible public agencies, nonprofits, educational agencies and community development organizations may apply. Educational, park, recreational, cultural or historic preservation use is required; ownership comes with continuing responsibilities.',description:'Light Station Boston and Little Brewster Island are offered through the National Historic Lighthouse Preservation Act. The property includes the lighthouse, keeper’s house, boathouse and other supporting structures.',source:'https://disposal.gsa.gov/s/noticetypedetail?type=Lighthouse+Screening',documents:[{title:'Official Notice of Availability',url:'https://pd.my.salesforce.com/sfc/p/30000000dixP/a/SJ00000C4n4r/zBgtHcFHnEd8P0oTKBLb3yvdIDSPu2bCcmstRfluUnE'}],sourceKeys:['lighthouse:MA-0945-AA'],checkedAt});
 const rank:Record<string,number>={'Bidding open':0,'Coming soon':1,'Eligible-entity transfer':2,'Disposal listed':3,'Removal opportunity':3,'Disposition planned':4,'Federal transfer':3,'Under contract':5,'Auction ended':6,'Auction closed':6,'Sold':7,'Disposed':7};
 for(const entry of entries)entry.agency="GSA real estate";
 entries.push(...additional as Property[]);
 entries.sort((a,b)=>(rank[a.status]??4)-(rank[b.status]??4)||a.title.localeCompare(b.title));
 return {properties:entries,checkedAt:at,live,inventoryCoverage,coverage:{auction:auctions.length,disposition:disposition.length,disposal:disposal.length,lighthouse:1}};
}
export const initialCatalog=assemble(snapshot.properties,checkedAt,false);
export {money};
