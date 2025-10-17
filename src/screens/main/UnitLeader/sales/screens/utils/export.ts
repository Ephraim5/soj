import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';

interface Sale {
  merchName: string;
  qtyRec: number;
  qtySold: number;
  unit: string;
  total: string;
}

export async function exportSalesReport(
  Toast: any,
  sales: Sale[],
  summary: { label: string; value: string }[]
) {
  const logoUrl =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsmM-M2lCUxo3znbL-qb0y8g_LwybbFcsnLuEjAZ_iR1wKbXyPWf91fmz4p1lPLZFFszs&usqp=CAU";

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { width: 100px; height: auto; margin-bottom: 12px; }
          h1 { color: #349DC5; margin: 0; }
          h2 { color: #555; margin-top: 32px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background-color: #349DC5; color: white; text-align: left; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
          .summary-label { font-weight: 600; }
          .footer { text-align: center; font-size: 10px; color: #888; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" class="logo" />
          <h1>Emporium Sales Report</h1>
          <p style="font-size: 12px; color: #888;">Powered by Streams of Joy</p>
        </div>

        <h2>Sales List</h2>
        <table>
          <tr>
            <th>Merch Name</th>
            <th>Qty Rec</th>
            <th>Qty Sold</th>
            <th>Unit</th>
            <th>Total</th>
          </tr>
          ${sales
      .map(
        (s) => `
            <tr>
              <td>${s.merchName}</td>
              <td>${s.qtyRec}</td>
              <td>${s.qtySold}</td>
              <td>${s.unit}</td>
              <td>${s.total}</td>
            </tr>
          `
      )
      .join("")}
        </table>

        <h2>Summary</h2>
        ${summary
      .map(
        (s) => `
          <div class="summary-row">
            <span class="summary-label">${s.label}</span>
            <span>${s.value}</span>
          </div>
        `
      )
      .join("")}

        <div class="footer">
          Generated on ${new Date().toLocaleString()} by Streams Of Joy Management App
        </div>
      </body>
    </html>
  `;

  // Generate PDF
  const { uri } = await Print.printToFileAsync({ html });

  const fileName = `Emporium_Sales_Report_${Date.now()}.pdf`;
  const localPath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: localPath });

  // Ask the user: Save or Share?
  Alert.alert(
    "Export Report",
    "Do you want to save this report on your device or share it?",
    [
      {
        text: "Save",
        onPress: async () => {
          if (Platform.OS === "android") {
            try {
              // let user pick a directory
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                Toast.show({
                  type: "info",
                  text1: "Permission Denied",
                  autoHide: true,
                  visibilityTime: 5000,
                })
                return;
              }

              // create file in that directory
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                fileName,
                "application/pdf"
              );

              // read pdf as base64 and write it into chosen file
              const pdfBase64 = await FileSystem.readAsStringAsync(localPath, {
                encoding: FileSystem.EncodingType.Base64,
              });

              await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              Toast.show({
                type: "success",
                text1: "Data Saved",
                autoHide: true,
                visibilityTime: 2000,
              })

            } catch (err) {
              console.error(err);
              Toast.show({
                type: "error",
                text1: "Network Issues",
                autoHide: true,
                visibilityTime: 2000,
              })
            }
          } else {
            // iOS → saving is done via Share sheet
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(localPath, {
                dialogTitle: "Save Report",
              });
            }
          }
        },
      },
      {
        text: "Share",
        onPress: async () => {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(localPath, {
              dialogTitle: "Share Sales Report",
            });
          } else {
            Toast.show({
              type: "error",
              text1: "Network Issues",
              autoHide: true,
              visibilityTime: 2000,
            })
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]
  );
}
