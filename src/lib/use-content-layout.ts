import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appLayout } from './layout';

export const ContentWidthContext = createContext<number | null>(null);

export function useContentLayout() {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = appLayout(window.width, window.fontScale, insets.left, insets.right);
  const measuredWidth = useContext(ContentWidthContext);
  return { ...window, width: Math.min(layout.contentWidth, measuredWidth ?? layout.contentWidth) };
}
