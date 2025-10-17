declare module "react-native-modern-datepicker" {
  import * as React from "react";
  import { ViewStyle, TextStyle } from "react-native";

  interface Options {
    backgroundColor?: string;
    textHeaderColor?: string;
    textDefaultColor?: string;
    selectedTextColor?: string;
    mainColor?: string;
    textSecondaryColor?: string;
    borderColor?: string;
  }

  interface DatePickerProps {
    mode?: "calendar" | "datepicker" | "monthYear" | "year";
    current?: string;
    selected?: string;
    minimumDate?: string;
    maximumDate?: string;
    onDateChange?: (date: string) => void;
    options?: Options;
    style?: ViewStyle;
  }

  export default class DatePicker extends React.Component<DatePickerProps> {}
}
