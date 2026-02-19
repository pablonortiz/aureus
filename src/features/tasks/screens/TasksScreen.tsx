import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {TaskCard} from '../components/TaskCard';
import {useTasksStore} from '../store/useTasksStore';
import type {RootStackParamList} from '../../../app/navigation/types';

export function TasksScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    tasks,
    completedTasks,
    loading,
    searchQuery,
    loadTasks,
    loadCompletedTasks,
    generateRecurringTasks,
    toggleTask,
    markAllTodayDone,
    setSearchQuery,
  } = useTasksStore();

  const [showCompleted, setShowCompleted] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      generateRecurringTasks().then(() => {
        loadTasks();
        loadCompletedTasks();
      });
    }, [generateRecurringTasks, loadTasks, loadCompletedTasks]),
  );

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
    }, 300);
  };

  const todayTasks = tasks;
  const pendingCount = todayTasks.length;

  return (
    <View style={styles.container}>
      <Header
        title="Tareas"
        onBack={() => navigation.goBack()}
        rightIcon="tune"
        onRightPress={() => navigation.navigate('ManageTaskCategories')}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tareas..."
          placeholderTextColor={colors.textMuted}
          value={localSearch}
          onChangeText={handleSearchChange}
        />
        {localSearch.length > 0 && (
          <Pressable
            onPress={() => {
              setLocalSearch('');
              setSearchQuery('');
            }}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={todayTasks}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: 100 + insets.bottom},
        ]}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Text style={styles.sectionLabel}>HOY</Text>
              {pendingCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            {pendingCount > 0 && (
              <Pressable onPress={markAllTodayDone}>
                <Text style={styles.markAllText}>MARCAR TODO COMO HECHO</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({item}) => (
          <TaskCard
            task={item}
            onToggle={() => toggleTask(item.id)}
            onPress={() => navigation.navigate('EditTask', {taskId: item.id})}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon name="task-alt" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Sin tareas pendientes</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {/* Completed section */}
            <Pressable
              style={styles.completedHeader}
              onPress={() => setShowCompleted(!showCompleted)}>
              <View style={styles.sectionLeft}>
                <Text style={styles.sectionLabel}>COMPLETADAS</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{completedTasks.length}</Text>
                </View>
              </View>
              <Icon
                name={showCompleted ? 'expand-less' : 'expand-more'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {showCompleted &&
              completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onPress={() =>
                    navigation.navigate('EditTask', {taskId: task.id})
                  }
                />
              ))}
          </>
        }
      />

      {/* FAB */}
      <Pressable
        style={[styles.fab, {bottom: 24 + insets.bottom}]}
        onPress={() => navigation.navigate('AddTask')}>
        <Icon name="add" size={28} color={colors.backgroundDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  markAllText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
  },
});
