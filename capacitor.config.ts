import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app', // your existing appId
  appName: 'kamustacards',            // your existing appName
  webDir: 'out',                      // your existing webDir

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
};

export default config;