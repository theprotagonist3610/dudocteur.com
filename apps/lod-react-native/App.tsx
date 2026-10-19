import { CATALOG } from '@lod/core';
import { palettes, RADIUS } from '@lod/theme';
import { StatusBar } from 'expo-status-bar';
import { FlatList, StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function App() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = palettes[scheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={CATALOG}
        keyExtractor={(tool) => tool.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Les Outils du Docteur</Text>
            <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
              Des calculateurs de santé simples, à visée informative — ils ne remplacent pas un avis médical.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              item.status !== 'disponible' && styles.unavailable,
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={{ color: colors['muted-foreground'] }}>{item.description}</Text>
          </View>
        )}
      />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingTop: 64, gap: 12 },
  header: { gap: 8, marginBottom: 12, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: RADIUS * 1.5, padding: 16, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  unavailable: { opacity: 0.6 },
});
