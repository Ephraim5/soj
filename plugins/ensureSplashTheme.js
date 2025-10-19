// Ensures Android splash resources exist even if the default plugin fails to write them.
// Generates attrs and Theme.SplashScreen styles so aapt can link resources.
const fs = require('fs');
const path = require('path');

function ensureFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withEnsureSplashTheme = (config) => {
  return require('@expo/config-plugins').withDangerousMod(config, [
    'android',
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const valuesDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'values');
      const valuesV31Dir = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'values-v31');

      // Define the attr used by expo-splash-screen styles
  const attrsXml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <!-- Compat attrs used by some splash styles -->\n    <attr name="windowSplashScreenBackground" format="color|reference"/>\n    <attr name="windowSplashScreenAnimatedIcon" format="reference"/>\n    <attr name="windowSplashScreenAnimationDuration" format="integer"/>\n    <attr name="windowSplashScreenIconBackgroundColor" format="color|reference"/>\n    <!-- Used by expo-splash-screen to set the app theme after splash -->\n    <attr name="postSplashScreenTheme" format="reference"/>\n</resources>\n`;
      ensureFile(path.join(valuesDir, 'attrs_expo_splash.xml'), attrsXml);

      // Base Theme.SplashScreen for all API levels (no windowSplashScreen* attrs here)
      const styleXmlBase = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <style name="Theme.SplashScreen" parent="Theme.MaterialComponents.DayNight.NoActionBar">\n        <item name="postSplashScreenTheme">@style/Theme.MaterialComponents.DayNight.NoActionBar</item>\n    </style>\n</resources>\n`;
      ensureFile(path.join(valuesDir, 'styles_expo_splash.xml'), styleXmlBase);

      // Minimal Theme.SplashScreen style for API 31+ with windowSplashScreen* attrs
      const styleXmlV31 = `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools">\n    <style name="Theme.SplashScreen" parent="Theme.MaterialComponents.DayNight.NoActionBar">\n        <item name="android:windowSplashScreenBackground">@android:color/white</item>\n        <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>\n        <item name="postSplashScreenTheme">@style/Theme.MaterialComponents.DayNight.NoActionBar</item>\n        <item name="android:windowSplashScreenAnimationDuration">200</item>\n        <item name="android:windowSplashScreenIconBackgroundColor" tools:targetApi="31">@android:color/white</item>\n    </style>\n</resources>\n`;
      ensureFile(path.join(valuesV31Dir, 'styles_expo_splash.xml'), styleXmlV31);

      return cfg;
    },
  ]);
};

module.exports = withEnsureSplashTheme;
