import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, touchTargets, radii } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={23}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <View style={styles.createIconWrapper}>
              <Ionicons
                name={focused ? 'add-circle' : 'add-circle-outline'}
                size={28}
                color={focused ? colors.primary : colors.primaryLight}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'pulse' : 'pulse-outline'}
              size={22}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 8,
    shadowColor: '#20231F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tabBarItem: {
    minHeight: touchTargets.minTouchTarget,
    paddingVertical: 2,
  },
  tabBarLabel: {
    ...typography.labelSmall,
    textTransform: 'none',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  createIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
