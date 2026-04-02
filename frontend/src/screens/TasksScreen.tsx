import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  primaryDark: '#0f5c49',
  primary: '#2ecc71',
  cyan: '#00ccff',
  deepBlue: '#0044cc',
  text: '#ffffff',
  textSecondary: '#8b949e',
  border: '#21262d',
  danger: '#ff4757',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  created_at: string;
  saved: boolean;
  expires_at: string;
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      const status = filter === 'all' ? '' : filter;
      const response = await axios.get(
        `${BACKEND_URL}/api/tasks${status ? `?status=${status}` : ''}`
      );
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const completeTask = async (taskId: string) => {
    try {
      await axios.put(`${BACKEND_URL}/api/tasks/${taskId}`, null, {
        params: { status: 'completed' },
      });
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const toggleSaveTask = async (task: Task) => {
    try {
      await axios.put(`${BACKEND_URL}/api/tasks/${task.id}`, null, {
        params: { saved: !task.saved },
      });
      loadTasks();
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BACKEND_URL}/api/tasks/${taskId}`);
              loadTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return 'alarm';
      case 'calendar':
        return 'calendar';
      case 'note':
      default:
        return 'document-text';
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskLeftBorder} />
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskHeaderLeft}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getTypeIcon(item.type)}
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.taskDescription} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity onPress={() => toggleSaveTask(item)} style={styles.bookmarkBtn}>
            <Ionicons
              name={item.saved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={item.saved ? COLORS.primary : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.taskFooter}>
          <Text style={styles.taskMeta}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          
          <View style={styles.taskActions}>
            {item.status === 'active' && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeTask(item.id)}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(item.id)}
            >
              <Ionicons name="trash" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'active' && styles.filterTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'completed' && styles.filterTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkbox-outline" size={64} color={COLORS.primaryDark} />
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptySubtitle}>
            Use the Voice tab to create tasks with "Hey Flow"
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      <View style={styles.footerNote}>
        <Ionicons name="time" size={16} color={COLORS.primary} />
        <Text style={styles.autoDeleteText}>
          Tasks auto-delete after 24 hours unless bookmarked
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  taskLeftBorder: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bookmarkBtn: {
    padding: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completeButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryDark,
  },
  autoDeleteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
