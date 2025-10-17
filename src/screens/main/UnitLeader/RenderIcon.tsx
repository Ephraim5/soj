import {
  FontAwesome,
  MaterialIcons,
  Ionicons,
  FontAwesome5,
  Foundation,
  MaterialCommunityIcons,
  Fontisto,
  FontAwesome6
} from '@expo/vector-icons';
import type { IconSpec } from './ReportScreen';


export function RenderIcon({ spec }: { spec?: IconSpec }) {
  if (!spec) return null;
  const props = { name: spec.name as any, size: spec.size ?? 24, color: spec.color };

  switch (spec.library) {
    case 'FontAwesome': return <FontAwesome {...props} />;
    case 'MaterialIcons': return <MaterialIcons {...props} />;
    case 'Ionicons': return <Ionicons {...props} />;
    case 'FontAwesome5': return <FontAwesome5 {...props} />;
    case 'Foundation': return <Foundation {...props} />;
    case 'MaterialCommunityIcons': return <MaterialCommunityIcons {...props} />;
    case 'Fontisto': return <Fontisto {...props} />;
    case 'FontAwesome6': return <FontAwesome6 {...props} />;
    default: return null;
  }
}