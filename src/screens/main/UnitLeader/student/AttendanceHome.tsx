// AttendanceHome.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const AttendanceHome: React.FC = () => {
  return (
    <SafeAreaView style={{ flexGrow: 1 }}>
    <ScrollView className="flex-1 bg-white px-4 pt-10">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Ionicons name="arrow-back" size={24} color="black" />
        <Text className="ml-4 text-xl font-semibold">Report</Text>
        <View className="ml-auto border border-gray-300 rounded-md px-3 py-1">
          <Text className="text-gray-700">2025 ▼</Text>
        </View>
      </View>

      {/* Top Attendance Summary Stats */}
      <Text className="text-lg font-semibold mb-4">
        Top Attendance Summary Stats
      </Text>
      <View className="flex-row flex-wrap justify-between">
        <View className="w-[48%] bg-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 text-sm">
            Total Average Attendance per Month - 2025
          </Text>
          <Text className="text-2xl font-bold mt-2">30</Text>
        </View>

        <View className="w-[48%] bg-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 text-sm">Highest Attendance Record</Text>
          <Text className="text-2xl font-bold mt-2">100</Text>
          <Text className="text-xs text-gray-600">20 June, 2025</Text>
        </View>

        <View className="w-[48%] bg-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 text-sm">Lowest Attendance Record</Text>
          <Text className="text-2xl font-bold mt-2">20</Text>
          <Text className="text-xs text-gray-600">2nd July, 2025</Text>
        </View>

        <View className="w-[48%] bg-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 text-sm">Comparison to Previous Year</Text>
          <Text className="text-2xl font-bold mt-2">20%</Text>
        </View>
      </View>

      {/* Average Attendance */}
      <View className="bg-gray-100 rounded-lg p-4 mb-4">
        <Text className="text-gray-500 text-sm">
          Average Attendance per Meeting in 2025:
        </Text>
        <Text className="text-xl font-bold mt-1">27</Text>

        <Text className="text-gray-500 text-sm mt-3">Latest Attendance Date:</Text>
        <Text className="text-base font-semibold">June 15, 2025</Text>
      </View>

      {/* Buttons */}
      <View className="flex-row justify-between mb-4">
        <TouchableOpacity className="bg-sky-500 px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold">View All Students</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-sky-500 px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold">Take Attendance</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity className="bg-sky-500 px-4 py-2 rounded-lg mb-6">
        <Text className="text-white font-semibold text-center">
          View Attendance Record
        </Text>
      </TouchableOpacity>

      {/* Weekly Attendance Breakdown */}
      <Text className="text-lg font-semibold mb-4">
        Weekly Attendance Breakdown
      </Text>
      <View className="bg-gray-100 rounded-lg p-4 mb-6">
        <Text className="text-sky-600 font-medium">
          Week 1 – 10 Aug 2025
        </Text>
        <Text className="text-gray-600 mt-2">Total Attendance: 23</Text>
        <Text className="text-gray-600">Male: 10</Text>
        <Text className="text-gray-600">Female: 10</Text>
        <Text className="text-gray-600">Married: 10</Text>
        <Text className="text-gray-600">Single: 13</Text>

        <TouchableOpacity className="bg-sky-500 px-4 py-2 rounded-lg mt-4">
          <Text className="text-white font-semibold text-center">
            View Attendance
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceHome;
