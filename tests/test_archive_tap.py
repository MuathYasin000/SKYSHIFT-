from urllib.parse import urlsplit,parse_qs
import pytest
from skyshift.archive_index import discover,canonical_tap_row,calibration_links,ObservationIndex,tap_query
from skyshift.models import SkyRegion
from test_archive_index import row,xml,COLLECTIONS,REGION


def tap_row(collection='spherex_qr2'):
    item=row(collection);item['product_uri']=urlsplit(item['access_url']).path.lstrip('/')
    item['access_url']=f"https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=ivo://irsa.ipac/{collection}?{item['obs_id']}/D2"
    item['pipeline_version']='7.0.5'
    return item


def links(item,wrong=False):
    return xml([{'semantics':'#this','access_url':item['access_url']+('wrong' if wrong else ''),'content_type':'image/fits','error_message':None},
                {'semantics':'#calibration','access_url':f"https://irsa.ipac.caltech.edu/ibe/data/spherex/{item['obs_collection'].split('_')[1]}/spectral_wcs/version/2/wave.fits",'content_type':'application/fits','error_message':None}])


def test_tap_canonical_products_deduplicate_with_sia_and_resolve_bounded_authoritative_links(tmp_path):
    calls=[]
    def fetch(url,**kwargs):
        calls.append(url)
        assert kwargs['attempts']==1
        if '/datalink/' in url:
            collection=parse_qs(urlsplit(url).query)['ID'][0].split('/')[3].split('?')[0]
            return links(canonical_tap_row(tap_row(collection),collection))
        query=parse_qs(urlsplit(url).query)['QUERY'][0]
        collection=query.split("o.collection='")[1].split("'")[0]
        return xml([tap_row(collection)])
    _,report=discover(REGION,COLLECTIONS,tmp_path/'tap',provider='tap',fetcher=fetch,index_path=tmp_path/'index.sqlite3')
    assert report['status']=='complete' and report['network_requests']==8 and len(calls)==8
    assert all(x['pipeline_version']=='7.0.5' and len(x['calibration_associations']['calibration_links'])==1 for x in report['observations'])
    db=ObservationIndex(tmp_path/'index.sqlite3')
    try:
        _,changes=db.ingest([row()],COLLECTIONS[0])
        assert changes['added']==0 and db.db.execute('SELECT count(*) FROM observations').fetchone()[0]==4
        saved=__import__('json').loads(db.db.execute('SELECT raw_json FROM observations WHERE collection=?',(COLLECTIONS[0],)).fetchone()[0])
        assert saved['pipeline_version']=='7.0.5' and len(saved['calibration_links'])==1
    finally:db.close()
    _,cached=discover(REGION,COLLECTIONS,tmp_path/'cached',provider='tap',fetcher=lambda *a,**k:pytest.fail('Should use complete scope cache'),index_path=tmp_path/'index.sqlite3')
    assert cached['network_requests']==0 and cached['metadata_rows']==4


def test_datalink_source_mismatch_does_not_attach_calibration_or_promote_science(tmp_path):
    item=canonical_tap_row(tap_row(),COLLECTIONS[0])
    with pytest.raises(ValueError,match='primary source'):calibration_links(links(item,wrong=True),item,COLLECTIONS[0])
    bad=tap_row();bad['access_url']=bad['access_url'].replace('spherex_qr2?','spherex_qr3?')
    with pytest.raises(ValueError,match='DataLink identity'):canonical_tap_row(bad,COLLECTIONS[0])
    _,report=discover(REGION,[COLLECTIONS[0]],tmp_path/'failed-links',provider='tap',fetcher=lambda url,**k:links(item,wrong=True) if '/datalink/' in url else xml([tap_row()]),index_path=tmp_path/'index.sqlite3')
    assert report['status']=='complete' and report['frames']==[]
    assert report['collections'][0]['parts'][-1]['status']=='unavailable'
    assert report['observations'][0]['calibration_associations']=={}


def test_tap_only_accepts_registered_collections_and_uses_real_geometry():
    with pytest.raises(ValueError):tap_query(REGION,"spherex_qr2' OR 1=1",1,2)
    with pytest.raises(ValueError):tap_query(REGION,COLLECTIONS[0],1,2,7)
    query=parse_qs(urlsplit(tap_query(SkyRegion(ra_deg=359.99,dec_deg=89.9,size_deg=.04),COLLECTIONS[0],60000,61000)).query)['QUERY'][0]
    assert 'TOP 5001' in query and 'INTERSECTS(p.poly,' in query and "a.producttype='science'" in query


def test_tap_5001_rows_are_partitioned_even_without_overflow_status(tmp_path):
    _,report=discover(REGION,[COLLECTIONS[0]],tmp_path/'overflow',provider='tap',fetcher=lambda *a,**k:xml([tap_row()]*5001),index_path=tmp_path/'index.sqlite3',max_requests=1)
    assert report['status']=='partial_or_unavailable' and report['metadata_rows']==0
