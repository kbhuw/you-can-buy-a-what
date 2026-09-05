"""Exercise real experimental Chromium WebMCP discovery and execution (no polyfill)."""
from playwright.sync_api import sync_playwright, expect
import json,sys
url=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4187'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-experimental-web-platform-features'])
 g=b.new_page();g.goto(url,wait_until='networkidle')
 assert g.evaluate('!!navigator.modelContextTesting'), 'This Chromium version lacks the native testing API.'
 tools=g.evaluate('navigator.modelContextTesting.listTools()');assert len(tools)==6
 def call(name,args):
  result=g.evaluate('([n,a])=>navigator.modelContextTesting.executeTool(n,JSON.stringify(a))',[name,args])
  return json.loads(result) if isinstance(result,str) else result
 result=call('search_items',{'query':'tuk tuk','max_price':1000})
 assert result['total']==1,result
 item=result['items'][0]
 assert len(call('get_whimsical_items',{})['items'])==20
 assert 'EXPORT ONLY' in call('get_item',{'id':item['id']})['restrictions']
 assert call('set_shortlist',{'id':item['id'],'saved':True})['total']==1
 expect(g.get_by_role('button',name='Your shortlist 1 saved')).to_be_visible()
 assert len(call('get_shortlist',{})['items'])==1
 call('show_item',{'id':item['id']})
 expect(g.locator('.sheet-title')).to_have_text(item['title'])
 call('set_shortlist',{'id':item['id'],'saved':False})
 assert call('get_shortlist',{})['items']==[]
 print('PASS native Chromium',b.version,': discovered and executed all six tools; page updated')
 b.close()
