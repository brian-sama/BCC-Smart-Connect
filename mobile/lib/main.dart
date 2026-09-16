import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'constants/bcc_colors.dart';
import 'screens/home_screen.dart';
import 'screens/auth_screen.dart';
import 'services/supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
      home: const _AppEntry(),
    );
  }
}

/// Checks for a saved session — navigates to HomeScreen if found,
/// or shows AuthScreen to let the user sign in or continue as guest.
class _AppEntry extends StatefulWidget {
  const _AppEntry();

  @override
  State<_AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<_AppEntry> {
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final token = await BccApiService.getToken();
    if (!mounted) return;

    // The app should open directly to the reporting/home screen.
    // Authentication remains available through the app UI if needed later.
    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));

    // If a token exists, keep the app in the home flow as the main entry point.
    // This intentionally avoids redirection to the sign-in/create-account flow.
    if (token == null) {
      setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: BccColors.primaryForest,
        body: Center(
          child: CircularProgressIndicator(color: BccColors.accentLime),
        ),
      );
    }
    return const HomeScreen();
  }
}
