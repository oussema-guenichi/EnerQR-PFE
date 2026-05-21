import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login.dart';

void main() {
  runApp(const EnerQRMobileApp());
}

class EnerQRMobileApp extends StatelessWidget {
  const EnerQRMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EnerQR Mobile',
      debugShowCheckedModeBanner: false, // Enlève le bandeau DEGUB
      theme: ThemeData(
        primaryColor: const Color(0xFF26C485),
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
      ),
      // On lance la page de connexion par défaut
      home: LoginScreen(),
    );
  }
}
