import {ImageResponse} from 'next/og';

export const dynamic = 'force-static';
const photos = [
  {label:'An actual lighthouse.',url:'https://d2m3yrz4x1yefr.cloudfront.net/property_image/1747250353.6403239_Light_House.jpg'},
  {label:'A government snowmobile.',url:'https://www.kush.pw/you-can-buy-a-what/api/surplus-image/376310'},
  {label:'A museum jet.',url:'https://www.kush.pw/you-can-buy-a-what/api/surplus-image/375361'},
];
export async function GET() {
  const images = await Promise.all(photos.map(async photo => {
    const response = await fetch(photo.url, {signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`Cover photo unavailable: ${photo.label}`);
    const bytes = await response.arrayBuffer();
    const mime = new Uint8Array(bytes)[0] === 0x89 ? 'image/png' : 'image/jpeg';
    return {...photo,src:`data:${mime};base64,${Buffer.from(bytes).toString('base64')}`};
  }));
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#131e2a',color:'#fff',padding:'38px 42px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',fontSize:21,color:'#ffcb64',letterSpacing:2}}>GOVERNMENT SURPLUS. UNEXPECTED FINDS.</div>
      <div style={{display:'flex',gap:15,alignItems:'baseline',fontSize:72,fontWeight:700,letterSpacing:-3,marginTop:9,marginBottom:28}}><span>you can buy a</span><span style={{color:'#ffcb64'}}>what?</span></div>
      <div style={{display:'flex',gap:18}}>
        {images.map(photo=><div key={photo.label} style={{display:'flex',flexDirection:'column',width:360,background:'#fff',borderRadius:12,overflow:'hidden'}}>
          <img src={photo.src} width={360} height={258} style={{objectFit:'cover'}}/>
          <div style={{display:'flex',padding:'17px 16px',color:'#243447',fontSize:22}}>{photo.label}</div>
        </div>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto',fontSize:23}}>
        <span style={{color:'#ffcb64'}}>made with puffle.ai</span><span style={{color:'#bcc8d1'}}>Explore the unexpected →</span>
      </div>
    </div>,
    {width:1200,height:630}
  );
}
