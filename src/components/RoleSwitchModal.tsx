import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../api/users';

export interface RoleItem {
  role: string;
  unit?: any; // keep flexible based on backend shape
}

interface Props {
  visible: boolean;
  roles: RoleItem[];
  activeRole?: string | null;
  selectedRole: string | null;
  // New: uniquely identify a selection when multiple roles share the same name (e.g., UnitLeader across units)
  selectedKey?: string | null;
  onSelect: (role: string) => void;
  // New: optional callback to capture the unique key
  onSelectKey?: (key: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

const RoleSwitchModal: React.FC<Props> = ({
  visible,
  roles,
  activeRole,
  selectedRole,
  selectedKey,
  onSelect,
  onSelectKey,
  onConfirm,
  onCancel,
  loading,
  title = 'Switch Active Role',
  subtitle = 'Pick the role you want to operate as.'
}) => {
  // Load full user from API when modal opens to ensure fresh church/ministry/unit names
  const [churchName, setChurchName] = useState<string>('');
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const tokenRaw = await AsyncStorage.getItem('token');
        if (!tokenRaw) return;
        const tokenTrimmed = tokenRaw.trim();
        const token = (() => {
          if (tokenTrimmed.startsWith('{') || tokenTrimmed.startsWith('[')) {
            try { const parsed = JSON.parse(tokenTrimmed); return typeof parsed === 'string' ? parsed : (parsed?.token || null); } catch { return null; }
          }
          return tokenRaw;
        })();
        if (!token) return;
        const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 });
        if (!mounted) return;
        if (res.data?.ok && res.data?.user) {
          setRemoteUser(res.data.user);
          // Inline name (fast path)
          const inlineName = res.data.user?.church?.name || res.data.user?.activeChurch?.name || res.data.user?.churchName || '';
          if (typeof inlineName === 'string' && inlineName) setChurchName(inlineName);
          // Resolve church id and fetch latest church details
          const churchId = res.data.user?.church?._id || res.data.user?.church || res.data.user?.activeChurch?._id;
          if (churchId) {
            try {
              const ch = await axios.get(`${BASE_URl}/api/churches/${churchId}`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 }
              );
              if (!mounted) return;
              const fetchedName = ch.data?.church?.name;
              if (fetchedName) setChurchName(String(fetchedName));
            } catch {
              // Fallback to public list if auth endpoint fails
              try {
                const pub = await axios.get(`${BASE_URl}/api/churches/public`, { timeout: 12000 });
                if (!mounted) return;
                const found = (pub.data?.churches || []).find((c:any) => String(c?._id) === String(churchId));
                if (found?.name) setChurchName(String(found.name));
              } catch { /* ignore */ }
            }
          }

          // Resolve unit names for roles that only include unit IDs
          try {
            const ids = new Set<string>();
            const rolesFromUser: any[] = Array.isArray(res.data.user?.roles) ? res.data.user.roles : [];
            rolesFromUser.forEach((rr:any)=>{
              const uId = (rr?.unit?._id) || rr?.unit || rr?.unitId;
              if (uId) ids.add(String(uId));
            });
            (roles || []).forEach((rr:any)=>{
              const uo = rr?.unit && typeof rr.unit === 'object' ? rr.unit : null;
              const uId = (uo?._id) || rr?.unit || rr?.unitId;
              if (uId) ids.add(String(uId));
            });
            const existing = { ...unitNames };
            for (const id of Array.from(ids)) {
              if (existing[id]) continue;
              try {
                const sum = await axios.get(`${BASE_URl}/api/units/${id}/summary`, { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 });
                const nm = sum.data?.unit?.name;
                if (nm) existing[id] = String(nm);
              } catch { /* ignore individual failures */ }
            }
            if (mounted) setUnitNames(existing);
          } catch { /* ignore */ }
        }
      } catch { /* ignore network errors here; labels will fallback */ }
    };
    if (visible) fetchUser();
    return () => { mounted = false; };
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.switchOverlay}>
        <View style={styles.switchSheet}>
          <Text style={styles.switchTitle}>{title}</Text>
            {subtitle ? <Text style={styles.switchSubtitle}>{subtitle}</Text> : null}
          <ScrollView style={{maxHeight:220, marginTop:12}}>
            {(() => {
              // Build per-role counts to detect duplicates
              const dupCounts: Record<string, number> = {};
              roles.forEach(r => { dupCounts[r.role] = (dupCounts[r.role] || 0) + 1; });
              const seenRole: Record<string, number> = {};
              const seenRenderKeys: Record<string, number> = {};
              return roles.map(r => {
                const value = r.role;
                // rendering each available role option
                const unitObj: any = (r as any)?.unit && typeof (r as any).unit === 'object' ? (r as any).unit : null;
                const unitId = unitObj?._id || (typeof (r as any).unit === 'string' ? (r as any).unit : undefined);
                let unitName = ((unitObj?.name) || (r as any)?.unitName || (r as any)?.unitLabel || '') as string;
                // Fallback: derive unit name from freshly fetched user roles when missing
                if (!unitName && remoteUser && Array.isArray(remoteUser.roles)) {
                  const match = remoteUser.roles.find((rr:any) => rr?.role === value && (
                    unitId ? (String((rr?.unit?._id)||rr?.unit||'') === String(unitId)) : true
                  ));
                  const uo = match?.unit && typeof match.unit === 'object' ? match.unit : null;
                  unitName = uo?.name || match?.unitName || match?.unitLabel || unitName;
                }
                // Selection key (used to persist activeUnitId): keep based on id when available
                const selectKey = `${value}::${unitId || 'global'}`;
                const isActive = activeRole === value;
                const isSelected = selectedKey ? (selectedKey === selectKey) : (selectedRole === value);

                // Display label per requested format
                let displayLabel = value;
                if (value === 'SuperAdmin') {
                  displayLabel = churchName ? `Super Admin - ${churchName}` : 'Super Admin';
                } else if (value === 'MinistryAdmin') {
                  let ministryName = (r as any)?.ministryName || (r as any)?.ministryLabel || (r as any)?.ministry || '';
                  if (!ministryName && remoteUser && Array.isArray(remoteUser.roles)) {
                    const m = remoteUser.roles.find((rr:any)=> rr?.role==='MinistryAdmin');
                    ministryName = m?.ministryName || m?.ministryLabel || (m?.ministry?.name) || ministryName;
                  }
                  // Show only the ministry name per requirement; fallback to generic if missing
                  displayLabel = ministryName || 'Ministry Admin';
                } else if (value === 'UnitLeader' || value === 'Member') {
                  const prettyRole = value === 'UnitLeader' ? 'Unit Leader' : value;
                  const resolved = unitName || (unitId ? unitNames[String(unitId)] : '') || '';
                  displayLabel = resolved ? `${prettyRole} - ${resolved}` : prettyRole;
                }

                // React render key: prefer name+role to avoid showing ids and ensure uniqueness
                let renderKeyBase = `${unitName || unitId || 'global'}::${value}`;
                if (seenRenderKeys[renderKeyBase] !== undefined) {
                  seenRenderKeys[renderKeyBase] += 1;
                  renderKeyBase = `${renderKeyBase}::${seenRenderKeys[renderKeyBase]}`;
                } else {
                  seenRenderKeys[renderKeyBase] = 0;
                }

                // Only show one 'Current' badge per role when duplicates exist
                const seenCount = seenRole[value] || 0;
                const shouldShowActive = isActive && (dupCounts[value] > 1 ? seenCount === 0 : true);
                seenRole[value] = seenCount + 1;

                return (
                  <TouchableOpacity
                    key={renderKeyBase}
                    style={[styles.roleRow, isSelected && styles.roleRowSelected]}
                    onPress={() => { onSelect(value); onSelectKey && onSelectKey(selectKey); }}
                    disabled={loading}
                  >
                    <View style={{flex:1}}>
                      <Text style={[styles.roleName, isSelected && {color:'#0B2346'}]}>
                        {displayLabel}
                      </Text>
                    </View>
                    {shouldShowActive && <View style={styles.badgeActive}><Text style={styles.badgeActiveText}>Current</Text></View>}
                    {isSelected && !isActive && <Icon name='checkmark-circle' size={22} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              });
            })()}
          </ScrollView>
          <View style={styles.switchButtonsRow}>
            <TouchableOpacity style={[styles.switchBtn, styles.switchCancel]} onPress={onCancel} disabled={loading}>
              <Text style={[styles.switchBtnText,{color:'#222'}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.switchBtn, {opacity: (!selectedKey || loading)?0.6:1}]} disabled={!selectedKey || loading} onPress={onConfirm}>
              {loading ? <ActivityIndicator color='#fff' /> : <Text style={styles.switchBtnText}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  switchOverlay:{
    flex:1,
    backgroundColor:'rgba(0,0,0,0.25)',
    justifyContent:'flex-end'
  },
  switchSheet:{
    backgroundColor:'#fff',
    padding:20,
    borderTopLeftRadius:26,
    borderTopRightRadius:26,
    elevation:12,
    shadowColor:'#000',
    shadowOpacity:0.18,
    shadowRadius:12,
    shadowOffset:{width:0,height:-2}
  },
  switchTitle:{
    fontSize:18,
    fontWeight:'600',
    color:'#0B2346'
  },
  switchSubtitle:{
    marginTop:4,
    color:'#555',
    fontSize:13
  },
  roleRow:{
    flexDirection:'row',
    alignItems:'center',
    paddingVertical:14,
    paddingHorizontal:10,
    borderBottomWidth:1,
    borderColor:'#f0f2f5'
  },
  roleRowSelected:{
    backgroundColor:'#eef7fc'
  },
  roleName:{
    fontSize:15,
    fontWeight:'600',
    color:'#222'
  },
  roleUnit:{
    fontSize:12,
    color:'#666',
    marginTop:2
  },
  badgeActive:{
    backgroundColor:'#349DC5',
    paddingHorizontal:8,
    paddingVertical:4,
    borderRadius:16,
    marginRight:8
  },
  badgeActiveText:{
    color:'#fff',
    fontSize:11,
    fontWeight:'600'
  },
  switchButtonsRow:{
    flexDirection:'row',
    justifyContent:'space-between',
    marginTop:18
  },
  switchBtn:{
    flex:1,
    backgroundColor:'#349DC5',
    marginLeft:12,
    paddingVertical:14,
    borderRadius:10,
    alignItems:'center'
  },
  switchCancel:{
    backgroundColor:'#eee',
    marginLeft:0,
    marginRight:8
  },
  switchBtnText:{
    color:'#fff',
    fontSize:15,
    fontWeight:'600'
  }
});

export default RoleSwitchModal;
