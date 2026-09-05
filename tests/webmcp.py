"""Browser integration checks. Requires Python Playwright and its Chromium browser.
The contract double verifies both API versions; it is not native-agent verification.
Run: python3 tests/webmcp.py http://127.0.0.1:4187
"""
from playwright.sync_api import sync_playwright, expect
import sys
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4187'
TOOLS = sorted(['search_items','get_whimsical_items','get_item','set_shortlist','get_shortlist','show_item'])
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for version in ['document', 'navigator', 'unsupported']:
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('''(() => {
          Object.defineProperty(document, 'modelContext', {value: undefined, configurable: true});
          Object.defineProperty(navigator, 'modelContext', {value: undefined, configurable: true});
        })()''')
        if version != 'unsupported':
            page.add_init_script('''(() => {
              const tools = new Map();
              window.testTools = tools;
              const context = {
                registerTool(tool, options) {
                  if (tools.has(tool.name)) throw new Error('Duplicate tool ' + tool.name);
                  if (options?.signal.aborted) throw new Error('Aborted');
                  tools.set(tool.name, tool);
                  if (TARGET === 'document') options?.signal.addEventListener('abort', () => tools.delete(tool.name));
                },
                unregisterTool(name) { tools.delete(name); }
              };
              Object.defineProperty(TARGET === 'document' ? document : navigator, 'modelContext', {value: context, configurable: true});
            })()'''.replace('TARGET', repr(version)))
        page.goto(URL, wait_until='networkidle')
        expect(page.locator('.product')).to_have_count(20)
        if version == 'unsupported':
            page.get_by_role('textbox', name='Search items').fill('tuk tuk')
            expect(page.locator('.product')).to_have_count(1)
            assert not errors, errors
            print('PASS unsupported browser: ordinary search works')
            page.close()
            continue
        page.wait_for_function('window.testTools?.size === 6')
        assert page.evaluate('Array.from(window.testTools.keys()).sort()') == TOOLS
        def call(name, args=None):
            return page.evaluate('([name,args]) => window.testTools.get(name).execute(args)', [name,args or {}])
        curated = call('get_whimsical_items')['items']
        assert len(curated) == 20 and len(set(x['id'] for x in curated)) == 20
        result = call('search_items', {'query':'tuk tuk','max_price':1000,'priced_only':True})
        assert result['total'] == 1
        chosen = result['items'][0]
        assert chosen['price'] <= 1000 and chosen['priceLabel'] and chosen['checkedAt']
        detail = call('get_item', {'id':chosen['id']})
        assert 'EXPORT ONLY' in detail['restrictions'] and detail['officialUrl'].startswith('https://')
        first = call('search_items', {'limit':1})
        second = call('search_items', {'limit':1,'offset':first['nextOffset']})
        assert first['items'][0]['id'] != second['items'][0]['id']
        assert call('search_items', {'max_price':0})['total'] >= 1
        assert call('search_items', {'query':'no-such-item-xyz'})['total'] == 0
        for name,args in [('get_item',{'id':'missing'}),('search_items',{'limit':51}),('search_items',{'offset':1.5}),('search_items',{'max_price':-1}),('set_shortlist',{'id':chosen['id'],'saved':'yes'})]:
            assert 'error' in call(name,args), (name,args)
        saved = call('set_shortlist', {'id':chosen['id'],'saved':True})
        assert saved['total'] == 1
        assert call('set_shortlist', {'id':chosen['id'],'saved':True})['total'] == 1
        expect(page.get_by_role('button', name='Your shortlist 1 saved')).to_be_visible()
        assert call('get_shortlist')['items'][0]['id'] == chosen['id']
        call('show_item', {'id':chosen['id']})
        expect(page.get_by_role('dialog')).to_be_visible()
        expect(page.locator('.sheet-title')).to_have_text(chosen['title'])
        page.get_by_role('button', name='Remove from shortlist', exact=True).click()
        assert call('get_shortlist')['items'] == []
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).not_to_be_visible()
        # Consecutive agent calls must observe the latest React state.
        ids = [x['id'] for x in curated[:2]]
        result = page.evaluate('''async ids => {
          for (const id of ids) await window.testTools.get('set_shortlist').execute({id,saved:true});
          return window.testTools.get('get_shortlist').execute({});
        }''', ids)
        assert [x['id'] for x in result['items']] == ids
        call('set_shortlist', {'id':ids[0],'saved':False})
        assert len(call('get_shortlist')['items']) == 1
        page.reload(wait_until='networkidle')
        page.wait_for_function('window.testTools?.size === 6')
        assert call('get_shortlist')['items'] == []
        assert not errors, errors
        print('PASS', version, ': 6 tools, search, pagination, validation, details, UI sync, idempotency and reload')
        page.close()
    browser.close()
