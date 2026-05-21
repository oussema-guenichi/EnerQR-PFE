import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_service.dart';

class DashboardScreen extends StatefulWidget {
  final String userId;

  const DashboardScreen({Key? key, required this.userId}) : super(key: key);

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  double prediction = 0.0;
  Map<String, dynamic>? clientData;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  void _fetchData() async {
    try {
      final predValue = await ApiService.getAIPrediction(widget.userId);
      final info = await ApiService.getClientInfo(widget.userId);
      if (mounted) {
        setState(() {
          prediction = predValue;
          clientData = info;
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text("EnerQR Portal", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _fetchData, 
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF26C485))
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF26C485)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Prediction Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF26C485), Color(0xFF1E9B6A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF26C485).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ]
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Icon(Icons.auto_graph_rounded, color: Colors.white, size: 32),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                "LIVE IA", 
                                style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text("Prédiction (7 jours)", style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 16)),
                        const SizedBox(height: 4),
                        Text(
                          "${prediction.toStringAsFixed(1)} kWh", 
                          style: GoogleFonts.outfit(color: Colors.white, fontSize: 42, fontWeight: FontWeight.bold)
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 40),
                  
                  // Section Machine
                  if (clientData != null && clientData!['pumps'] != null && (clientData!['pumps'] as List).isNotEmpty) ...[
                    _buildSectionHeader("MA MACHINE"),
                    const SizedBox(height: 16),
                    _buildPremiumCard(
                      Icons.settings_suggest_rounded, 
                      clientData!['pumps'][0]['modele_pac'], 
                      clientData!['pumps'][0]['type_pac'],
                      const Color(0xFF3A86FF)
                    ),
                    const SizedBox(height: 32),
                    
                    _buildSectionHeader("RESPONSABLE TECHNIQUE"),
                    const SizedBox(height: 16),
                    _buildPremiumCard(
                      Icons.support_agent_rounded, 
                      clientData!['technicien_username'] ?? "Non assigné", 
                      clientData!['technicien_email'] ?? "Contactez le support",
                      const Color(0xFFFFB703)
                    ),
                  ],

                  const SizedBox(height: 48),
                  
                  // Action Button
                  Center(
                    child: Container(
                      width: 220,
                      height: 60,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        color: const Color(0xFFEF476F).withOpacity(0.1),
                        border: Border.all(color: const Color(0xFFEF476F).withOpacity(0.2)),
                      ),
                      child: TextButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Scan QR Activé..."))
                          );
                        }, 
                        icon: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFFEF476F)), 
                        label: Text(
                          "SCANNER QR", 
                          style: GoogleFonts.outfit(color: Color(0xFFEF476F), fontWeight: FontWeight.bold, fontSize: 16)
                        )
                      ),
                    ),
                  )
                ],
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title, 
      style: GoogleFonts.inter(color: Colors.white38, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2)
    );
  }

  Widget _buildPremiumCard(IconData icon, String title, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05))
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle, style: GoogleFonts.inter(color: Colors.white54, fontSize: 14)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
