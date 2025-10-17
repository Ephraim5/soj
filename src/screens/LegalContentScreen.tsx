import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { getLegal, LegalPage } from '../api/support';

interface Props { route: { params?: { type?: 'terms' | 'privacy' } }; navigation: any; }

export default function LegalContentScreen({ route, navigation }: Props){
  const type = route?.params?.type === 'privacy' ? 'privacy' : 'terms';
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts: { force?: boolean } = {}) => {
    try {
      if(!opts.force) setLoading(true); else setRefreshing(true);
      const res = await getLegal(type, { forceRefresh: opts.force });
      setPage(res.page);
      setFromCache(res.fromCache);
      setError(null);
    } catch(e:any){
      setError(e?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [type]);

  useEffect(()=>{ load(); }, [load]);

  const lastUpdated = page?.lastUpdated ? new Date(page.lastUpdated).toLocaleDateString() : '';

  return (
    <View style={{ flex:1, backgroundColor:'#fff' }}>
      <ScrollView
        contentContainerStyle={{ padding:16, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load({ force:true })} />}
      >
        <Text style={{ fontSize:26, fontWeight:'700', marginBottom:4 }}>{page?.title || (type==='terms'?'Terms of Use':'Privacy Policy')}</Text>
        {fromCache && <Text style={{ fontSize:11, color:'#888', marginBottom:8 }}>Showing cached copy… Pull to refresh.</Text>}
        {lastUpdated && <Text style={{ fontSize:12, color:'#666', marginBottom:16 }}>Last Updated: {lastUpdated}</Text>}

        {loading && !page && (
          <View style={{ marginTop:40 }}>
            <ActivityIndicator />
          </View>
        )}

        {error && !page && (
          <View style={{ marginTop:40 }}>
            <Text style={{ color:'#c00', textAlign:'center', marginBottom:12 }}>{error}</Text>
            <TouchableOpacity onPress={()=>load()} style={{ alignSelf:'center', backgroundColor:'#111', paddingHorizontal:20, paddingVertical:12, borderRadius:8 }}>
              <Text style={{ color:'#fff', fontWeight:'600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {page && page.sections.map((s, idx) => (
          <View key={idx} style={{ marginBottom:20 }}>
            {s.heading && <Text style={{ fontSize:17, fontWeight:'600', marginBottom:6 }}>{s.heading}</Text>}
            <Text style={{ lineHeight:20, color:'#333' }}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
