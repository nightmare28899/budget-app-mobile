# React Native & Expo Skills
- Always use standard React Native components (`View`, `Text`, `TouchableOpacity`, `StyleSheet`).
- Strictly follow React Navigation (or Expo Router) patterns. Do not pass complex objects as route params; pass IDs and fetch data instead.
- For lists, always prefer `FlatList` or `FlashList` with proper `keyExtractor` for performance.
- Avoid inline styles. Always define styles using `StyleSheet.create` at the bottom of the file.
