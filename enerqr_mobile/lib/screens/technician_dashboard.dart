import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_service.dart';

class TechnicianDashboardScreen extends StatefulWidget {
  final String techId;

  const TechnicianDashboardScreen({Key? key, required this.techId}) : super(key: key);

  @override
  _TechnicianDashboardScreenState createState() => _TechnicianDashboardScreenState();
}

class _TechnicianDashboardScreenState extends State<TechnicianDashboardScreen> {
  List<dynamic> clients = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchClients();
  }

  void _fetchClients() async {
    try {
      final data = await ApiService.getTechnicienClients(widget.techId);
      setState(() {
        clients = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _showUpdateDialog(dynamic client) {
    final TextEditingController avantCtrl = TextEditingController(text: client['conso_avant'].toString());
    final TextEditingController apresCtrl = TextEditingController(text: client['conso_apres'].toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text("Mise à jour consommation", style: GoogleFonts.inter(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDialogField(avantCtrl, "Conso Avant (kWh)"),
            const SizedBox(height: 16),
            _buildDialogField(apresCtrl, "Conso Après (kWh)"),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Annuler")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF26C485)),
            onPressed: () async {
              try {
                final res = await ApiService.updateClientConsumption(
                  client['id'],
                  double.parse(avantCtrl.text),
                  double.parse(apresCtrl.text),
                );
                Navigator.pop(context);
                _fetchClients();
                
                if (res['ia_anomaly_detected'] == true) {
                  _showAnomalyAlert(res['message']);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Données mises à jour !")));
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text("Enregistrer"),
          ),
        ],
      ),
    );
  }

  void _showAnomalyAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF450A0A),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.white),
            SizedBox(width: 10),
            Text("ALERTE IA", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(message, style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Compris", style: TextStyle(color: Colors.white))),
        ],
      ),
    );
  }

  Widget _buildDialogField(TextEditingController ctrl, String label) {
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54),
        enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF26C485))),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text("Portail Technicien", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _fetchClients, 
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF26C485))
          ),
        ],
      ),
      body: Stack(
        children: [
          // Background Glow
          Positioned(
            top: 100,
            right: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF26C485).withOpacity(0.05),
              ),
            ),
          ),
          
          isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF26C485)))
            : clients.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_off_rounded, size: 64, color: Colors.white.withOpacity(0.1)),
                        const SizedBox(height: 16),
                        Text("Aucun client assigné", style: GoogleFonts.inter(color: Colors.white54, fontSize: 16)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    itemCount: clients.length,
                    itemBuilder: (context, index) {
                      final client = clients[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: Theme(
                            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                            child: ExpansionTile(
                              tilePadding: const EdgeInsets.all(20),
                              leading: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF26C485).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person_rounded, color: Color(0xFF26C485)),
                              ),
                              title: Text(
                                client['username'], 
                                style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)
                              ),
                              subtitle: Text(
                                client['pump_model'] ?? "Modèle inconnu", 
                                style: GoogleFonts.inter(color: Colors.white54, fontSize: 13)
                              ),
                              children: [
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                                  child: Column(
                                    children: [
                                      const Divider(color: Colors.white10),
                                      const SizedBox(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          _buildMetricBox("Avant", "${client['conso_avant']} kWh", const Color(0xFF3A86FF)),
                                          _buildMetricBox("Après", "${client['conso_apres']} kWh", const Color(0xFF26C485)),
                                        ],
                                      ),
                                      const SizedBox(height: 24),
                                      SizedBox(
                                        width: double.infinity,
                                        height: 50,
                                        child: ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF26C485).withOpacity(0.1),
                                            foregroundColor: const Color(0xFF26C485),
                                            elevation: 0,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12),
                                              side: BorderSide(color: const Color(0xFF26C485).withOpacity(0.2))
                                            ),
                                          ),
                                          onPressed: () => _showUpdateDialog(client),
                                          icon: const Icon(Icons.edit_note_rounded),
                                          label: Text("Mettre à jour", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
        ],
      ),
    );
  }

  Widget _buildMetricBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      width: 140,
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
