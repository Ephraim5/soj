// src/styles.ts
import { StyleSheet } from "react-native";
import { heightPercentageToDP, widthPercentageToDP } from "react-native-responsive-screen";

export const PRIMARY_BLUE = "#349DC5"; // main active blue (adjust to match pixel-perfect)
export const MUTED_GRAY = "#9AA3A8";
export const CARD_BG = "#ffffff";
export const SCREEN_BG = "#f7f9fb";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: heightPercentageToDP(3),
    marginTop: heightPercentageToDP(1),
    backgroundColor: SCREEN_BG,
  },
  headerRow: {
    height: 64,
    marginTop: 2,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backChevron: { fontSize: 28, color: "#333" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f1720" },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    gap: 0,
    alignItems: "center",
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginRight: 18,
  },
  tabText: { fontSize: 15, fontWeight: "600", paddingHorizontal: widthPercentageToDP(12) },
  tabActiveText: {
    color: PRIMARY_BLUE,
    borderBottomWidth: 3,
    borderBottomColor: PRIMARY_BLUE,
    paddingBottom: 6,
  },
  tabInactiveText: {
    color: MUTED_GRAY,
    borderBottomWidth: 3,
    borderBottomColor: MUTED_GRAY,
    paddingBottom: 6,
  },

  searchBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,

  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.2,
    borderColor: MUTED_GRAY,

  },

  sectionTitle: {
    marginVertical: 12,
    color: "#263238",
    fontWeight: "700",
    fontSize: 14,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1.2,
    borderColor: PRIMARY_BLUE,
    shadowColor: "#00000010",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
  },
  dropdown: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  placeholderStyle: {
    fontSize: 14,
    color: "#999",
  },
  selectedTextStyle: {
    fontSize: 14,
    color: "#000",
  },
  announcementCard: {
    backgroundColor: CARD_BG,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1.2,
    borderColor: "#e6eef2",
  },

  cardTitle: { fontSize: 15, fontWeight: "700", color: "#102027" },
  subText: { color: "#607d8b", marginTop: 4, fontSize: 14, },
  cardDescription: { marginTop: 8, color: "#455a64" },

  tagRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  tag: {
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    marginTop: 6,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 12,
  },

  statusText: { marginTop: 10, color: "#374151" },
  statusLabel: { color: "#1db954", fontWeight: "700" },

  announcementActions: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "flex-start",
  },
  announcementEdit: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  announcementDelete: {
    backgroundColor: "#e14c4c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  footer: {
    padding: 16,
    justifyContent: "center",
  },
  actionButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },

  inputLabel: { color: "#334155", marginTop: 6, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e6eef2",
  },
  textarea: { minHeight: 110, textAlignVertical: "top" },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  saveButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});
