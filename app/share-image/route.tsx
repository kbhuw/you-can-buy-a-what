import {ImageResponse} from 'next/og';

export const dynamic = 'force-static';
export function GET() {
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#131e2a',color:'#fff',padding:'62px 72px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',fontSize:23,color:'#ffcb64',letterSpacing:3}}>GOVERNMENT SURPLUS. UNEXPECTED FINDS.</div>
      <div style={{display:'flex',flexDirection:'column',marginTop:38,fontWeight:700,fontSize:90,lineHeight:1.05,letterSpacing:-4}}>
        <span>you can buy a</span><span style={{color:'#ffcb64',fontSize:130}}>what?</span>
      </div>
      <div style={{display:'flex',fontSize:30,color:'#e0e6eb',marginTop:24}}>Lighthouses. Museum jets. Snowmobiles.</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto',paddingTop:28,borderTop:'1px solid #42505d',fontSize:23}}>
        <span style={{color:'#ffcb64'}}>made with puffle.ai</span><span style={{color:'#bcc8d1'}}>Explore the unexpected →</span>
      </div>
    </div>,
    {width:1200,height:630}
  );
}
