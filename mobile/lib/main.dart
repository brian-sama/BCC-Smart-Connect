import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'constants/bcc_colors.dart';
import 'screens/home_screen.dart';
import 'services/supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: BccColors.primaryForest,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const BccSmartConnectApp());
}

class BccSmartConnectApp extends StatelessWidget {
  const BccSmartConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BCC SmartConnect',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: BccColors.primaryForest,
          primary: BccColors.primaryForest,
          secondary: BccColors.accentLime,
          surface: BccColors.scaffoldBg,
        ),
        scaffoldBackgroundColor: BccColors.scaffoldBg,
        appBarTheme: const AppBarTheme(
          backgroundColor: BccColors.primaryForest,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
