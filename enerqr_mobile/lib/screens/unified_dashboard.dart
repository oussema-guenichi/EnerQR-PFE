import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_service.dart';
import 'login.dart';

class UnifiedDashboardScreen extends StatefulWidget {
  final String userId;
  final String role;
  final String username;
  final bool consentementRgpd;

  const UnifiedDashboardScreen({
    Key? key, 
    required this.userId, 
    required this.role, 
    required this.username,
    this.consentementRgpd = true,
  }) : super(key: key);

  @override
  _UnifiedDashboardScreenState createState() => _UnifiedDashboardScreenState();
}

class _UnifiedDashboardScreenState extends State<UnifiedDashboardScreen> {
  String activeTab = 'stats';
  bool isLoading = true;
  
  Map<String, dynamic>? stats;
  Map<String, dynamic>? clientStats;
  List<dynamic> clients = [];
  List<dynamic> pumps = [];
  List<dynamic> techniciens = [];
  List<dynamic> anomalies = [];
  List<dynamic> garanties = [];
  
  double clientPrediction = 0.0;
  Map<String, dynamic>? clientInfo;
  List<dynamic> clientCampaigns = [];
  List<dynamic> clientInvoices = [];

  // Variables pour le chatbot
  final TextEditingController _chatController = TextEditingController();
  List<Map<String, String>> chatMessages = [
    {"sender": "ai", "text": "Bonjour ! Je suis l'assistant EnerQR. Comment puis-je vous aider aujourd'hui ?"}
  ];
  bool isChatLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.role == 'technicien') activeTab = 'anomalies';
    else if (widget.role == 'client') activeTab = 'my_pump';
    _fetchAllData();
  }

  Future<void> _fetchAllData() async {
    setState(() => isLoading = true);
    try {
      if (widget.role == 'admin') {
        final s = await ApiService.getAdminStats();
        final c = await ApiService.getAllClients();
        final p = await ApiService.getAllPumps();
        final t = await ApiService.getAllTechniciens();
        final a = await ApiService.getAllAnomalies();
        final g = await ApiService.getAllGaranties();
        setState(() {
          stats = s;
          clients = c;
          pumps = p;
          techniciens = t;
          anomalies = a;
          garanties = g;
        });
      } else if (widget.role == 'technicien') {
        final a = await ApiService.getAllAnomalies();
        final myClients = await ApiService.getTechnicienClients(widget.userId);
        setState(() {
          anomalies = a;
          clients = myClients;
        });
      } else {
        final pred = await ApiService.getAIPrediction(widget.userId);
        final info = await ApiService.getClientInfo(widget.userId);
        final camps = await ApiService.getClientCampaigns(widget.userId);
        final invs = await ApiService.getClientInvoices(widget.userId);
        Map<String, dynamic>? st;
        try { st = await ApiService.getClientStats(widget.userId); } catch (_) {}
        setState(() {
          clientPrediction = pred;
          clientInfo = info;
          clientStats = st;
          clientCampaigns = camps;
          clientInvoices = invs;
        });
      }
    } catch (e) {
      debugPrint(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _sendMessageToAI() async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      chatMessages.add({"sender": "user", "text": text});
      _chatController.clear();
      isChatLoading = true;
    });

    try {
      final reply = await ApiService.chatWithAI(widget.userId, text);
      setState(() {
        chatMessages.add({"sender": "ai", "text": reply});
      });
    } catch (e) {
      setState(() {
        chatMessages.add({"sender": "ai", "text": "Erreur serveur. Veuillez réessayer."});
      });
    } finally {
      setState(() => isChatLoading = false);
    }
  }

  void _downloadInvoice(String invId) async {
    final url = '${ApiConfig.baseUrl}/invoices/$invId/download';
    try {
      if (!await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Impossible d\'ouvrir la facture.')));
      }
    } catch (e) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur d\'ouverture du fichier.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: _buildAppBar(),
      drawer: _buildDrawer(),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF26C485)))
        : _buildBody(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(kToolbarHeight),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(bottom: BorderSide(color: Colors.black.withOpacity(0.08), width: 0.5)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              children: [
                Builder(
                  builder: (context) => GestureDetector(
                    onTap: () => Scaffold.of(context).openDrawer(),
                    child: const Icon(Icons.menu, color: Color(0xFF0F172A), size: 24),
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  width: 6,
                  height: 28,
                  decoration: BoxDecoration(
                    color: const Color(0xFF26C485),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("EnerQR", style: GoogleFonts.outfit(fontWeight: FontWeight.w500, color: const Color(0xFF0F172A), fontSize: 14)),
                    Text(
                      widget.role == 'admin' ? "Portail Admin" : widget.role == 'technicien' ? "Portail Technicien" : "Espace Client",
                      style: GoogleFonts.inter(color: Colors.grey, fontSize: 11),
                    ),
                  ],
                ),
                const Spacer(),
                if (widget.role != 'client') ...[
                  _buildPill(Icons.person, "${stats?['total_techniciens'] ?? techniciens.length}", const Color(0xFFEAF3DE), const Color(0xFF3B6D11)),
                  const SizedBox(width: 6),
                  _buildPill(Icons.warning, "${anomalies.where((a)=>a['statut']!='resolu').length}", const Color(0xFFFCEBEB), const Color(0xFFA32D2D)),
                ]
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPill(IconData icon, String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 4),
          Text(text, style: GoogleFonts.outfit(color: textColor, fontWeight: FontWeight.w500, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: const Color(0xFF0F172A),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.only(top: 50, bottom: 20, left: 24, right: 24),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.06), width: 0.5)),
            ),
            child: Row(
              children: [
                Stack(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: const Color(0xFF26C485).withOpacity(0.10),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF26C485).withOpacity(0.25), width: 1.5),
                      ),
                      child: const Icon(Icons.person, color: Color(0xFF26C485), size: 24),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 13,
                        height: 13,
                        decoration: BoxDecoration(
                          color: const Color(0xFF26C485),
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF0F172A), width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.username, style: GoogleFonts.outfit(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500)),
                      Text(widget.role.toUpperCase(), style: GoogleFonts.inter(color: Colors.white.withOpacity(0.3), fontSize: 10, letterSpacing: 1.0)),
                      const SizedBox(height: 4),
                      Text("EnerQR v2.0 · France", style: GoogleFonts.inter(color: const Color(0xFF26C485).withOpacity(0.4), fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                if (widget.role == 'admin') ...[
                  _buildDrawerItem('stats', "Vue d'ensemble", Icons.dashboard_outlined),
                  _buildDrawerItem('clients', "Gestion Clients", Icons.people_outline),
                  _buildDrawerItem('pumps', "Parc Machines", Icons.qr_code_outlined),
                  _buildDrawerItem('techniciens', "Équipe Technique", Icons.build_outlined),
                  _buildDrawerItem('anomalies', "Suivi Anomalies", Icons.warning_amber_rounded),
                  _buildDrawerItem('garanties', "Garanties & Fact.", Icons.shield_outlined),
                ],
                if (widget.role == 'technicien') ...[
                  _buildDrawerItem('anomalies', "Gestion Anomalies", Icons.warning_amber_rounded),
                  _buildDrawerItem('my_clients', "Mes Clients", Icons.person_search_outlined),
                ],
                if (widget.role == 'client') ...[
                  _buildDrawerItem('my_pump', "Mon Dashboard", Icons.home_repair_service_outlined),
                ],
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => LoginScreen()));
            },
            child: Container(
              margin: const EdgeInsets.only(left: 16, right: 16, bottom: 24, top: 10),
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFA22D2D).withOpacity(0.10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFA22D2D).withOpacity(0.20), width: 0.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.logout, color: Color(0xFFE24B4A), size: 18),
                  const SizedBox(width: 8),
                  Text("Déconnexion", style: GoogleFonts.inter(color: const Color(0xFFE24B4A), fontSize: 13, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(String id, String label, IconData icon) {
    bool isSelected = activeTab == id;
    return GestureDetector(
      onTap: () {
        setState(() => activeTab = id);
        Navigator.pop(context);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        child: Stack(
          children: [
            if (isSelected) 
              Container(decoration: BoxDecoration(color: const Color(0xFF26C485).withOpacity(0.07)), child: const SizedBox(width: double.infinity, height: 44)),
            if (isSelected)
              Positioned(
                left: 0, top: 6, bottom: 6,
                child: Container(
                  width: 3,
                  decoration: const BoxDecoration(
                    color: Color(0xFF26C485),
                    borderRadius: BorderRadius.only(topRight: Radius.circular(3), bottomRight: Radius.circular(3)),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
              child: Row(
                children: [
                  Icon(icon, size: 18, color: isSelected ? const Color(0xFF26C485) : Colors.white.withOpacity(0.25)),
                  const SizedBox(width: 14),
                  Text(
                    label, 
                    style: GoogleFonts.inter(
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.45), 
                      fontSize: 13, 
                      fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400
                    )
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {String? actionText}) {
    return Row(
      children: [
        Container(
          width: 3, height: 16,
          decoration: BoxDecoration(color: const Color(0xFF26C485), borderRadius: BorderRadius.circular(99)),
        ),
        const SizedBox(width: 8),
        Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500, color: const Color(0xFF0F172A))),
        const Spacer(),
        if (actionText != null) Text(actionText, style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF26C485))),
      ],
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.role == 'admin') _renderAdminView(),
          if (widget.role == 'technicien') _renderTechnicianView(),
          if (widget.role == 'client') _buildClientDashboard(),
        ],
      ),
    );
  }

  Widget _renderAdminView() {
    switch (activeTab) {
      case 'clients': return _buildAdminClientsList();
      case 'pumps': return _buildAdminPumpsList();
      case 'techniciens': return _buildAdminTechsList();
      case 'anomalies': return _buildAdminAnomaliesList();
      case 'garanties': return _buildAdminGarantiesList();
      case 'stats':
      default:
        return _buildAdminDashboard();
    }
  }

  Widget _renderTechnicianView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5),
          ),
          child: Row(
            children: [
              Expanded(child: _buildTechTab("Anomalies", activeTab == 'anomalies')),
              Expanded(child: _buildTechTab("Mes Clients", activeTab == 'my_clients')),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (activeTab == 'anomalies') ...[
          Row(
            children: [
              Expanded(child: _buildTechCounter(1, "Faible", const Color(0xFFBA7517), "${anomalies.where((a)=>a['niveau']==1 && a['statut']!='resolu').length}")),
              const SizedBox(width: 12),
              Expanded(child: _buildTechCounter(2, "Moyen", const Color(0xFFD85A30), "${anomalies.where((a)=>a['niveau']==2 && a['statut']!='resolu').length}")),
              const SizedBox(width: 12),
              Expanded(child: _buildTechCounter(3, "Critique", const Color(0xFFA32D2D), "${anomalies.where((a)=>a['niveau']==3 && a['statut']!='resolu').length}")),
            ],
          ),
          const SizedBox(height: 24),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: anomalies.length,
            itemBuilder: (context, index) => _buildTechAnomalyRow(anomalies[index]),
          ),
        ] else ...[
          _buildTechClientsList(),
        ]
      ],
    );
  }

  // --- CLIENT DASHBOARD ---
  Widget _buildClientDashboard() {
    final ecoEur = clientStats?['economies_eur_an']?.toStringAsFixed(0) ?? '0';
    final consoKwh = clientStats?['conso_cumulee_kwh']?.toStringAsFixed(0) ?? '0';
    final mois = clientStats?['mois_ecoules']?.toStringAsFixed(0) ?? '0';
    final predKwh = clientPrediction > 0 ? '~${clientPrediction.round()}' : 'Non disp.';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!widget.consentementRgpd) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFAEEDA), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFD85A30).withOpacity(0.3), width: 0.5)),
            child: Row(children: [
              const Icon(Icons.info_outline, color: Color(0xFFD85A30), size: 16),
              const SizedBox(width: 8),
              Expanded(child: Text("Veuillez accepter le consentement RGPD.", style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFFD85A30)))),
            ]),
          ),
          const SizedBox(height: 16),
        ],

        // Hero Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF13223A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            )
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF26C485).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: const Color(0xFF26C485).withOpacity(0.25), width: 0.5),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.eco, color: Color(0xFF26C485), size: 12),
                    const SizedBox(width: 4),
                    Text("Économies cumulées", style: GoogleFonts.inter(color: const Color(0xFF26C485).withOpacity(0.8), fontSize: 11, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text("Depuis l'installation", style: GoogleFonts.inter(color: Colors.white.withOpacity(0.4), fontSize: 12)),
              Text("$ecoEur €", style: GoogleFonts.outfit(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w500)),
              Text("Sur $mois mois · Estimation non contractuelle", style: GoogleFonts.inter(color: Colors.white.withOpacity(0.35), fontSize: 12)),
              const SizedBox(height: 24),
              Row(
                children: [
                  _buildHeroChip("STATUT", "Actif"),
                  const SizedBox(width: 8),
                  _buildHeroChip("Z. CLIM", "H1"),
                  const SizedBox(width: 8),
                  _buildHeroChip("PACK", "Premium"),
                ],
              )
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Stats Cards
        Row(
          children: [
            Expanded(
              child: _buildClientStatCard(
                "Consommation totale", "$consoKwh", "kWh", 
                Icons.bolt, const Color(0xFFE6F1FB), const Color(0xFF185FA5), 
                "↓ 38%", const Color(0xFFEAF3DE), const Color(0xFF3B6D11)
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildClientStatCard(
                "Prédiction semaine +1", predKwh, "kWh", 
                Icons.wb_sunny_outlined, const Color(0xFFFAEEDA), const Color(0xFF854F0B), 
                "IA", const Color(0xFFFAECE7), const Color(0xFFE24B4A) 
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),

        if (clientCampaigns.isNotEmpty) ...[
          _buildSectionHeader("Offres du moment", actionText: "Voir tout"),
          const SizedBox(height: 16),
          SizedBox(
            height: 156,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: clientCampaigns.length,
              itemBuilder: (context, index) {
                final c = clientCampaigns[index];
                return Container(
                  width: 280,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF26C485).withOpacity(0.25), width: 0.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFF26C485),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.local_offer_outlined, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c['titre'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 13, color: const Color(0xFF0F172A)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 2),
                                Text(c['description'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: Colors.black54), maxLines: 2, overflow: TextOverflow.ellipsis),
                              ],
                            ),
                          )
                        ],
                      ),
                      const Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Offre EnerQR", style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF26C485).withOpacity(0.7), fontStyle: FontStyle.italic)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF26C485).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text("Voir l'offre", style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF26C485), fontWeight: FontWeight.w500)),
                          )
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 32),
        ],

        _buildSectionHeader("Votre technicien assigné"),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5),
          ),
          child: Row(
            children: [
              Container(
                width: 46, height: 46,
                decoration: const BoxDecoration(color: Color(0xFF26C485), shape: BoxShape.circle),
                child: const Icon(Icons.person, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(clientInfo?['technicien_username'] ?? "Non assigné", style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.w500)),
                    Text(clientInfo?['technicien_email'] ?? "Email introuvable", style: GoogleFonts.inter(color: Colors.black54, fontSize: 11)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(99)),
                child: Row(
                  children: [
                    Container(width: 5, height: 5, decoration: const BoxDecoration(color: Color(0xFF3B6D11), shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text("En ligne", style: GoogleFonts.inter(color: const Color(0xFF3B6D11), fontSize: 10, fontWeight: FontWeight.w500)),
                  ],
                ),
              )
            ],
          ),
        ),
        const SizedBox(height: 32),

        _buildSectionHeader("Mes Factures"),
        const SizedBox(height: 16),
        if (clientInvoices.isNotEmpty) ...[
          ...clientInvoices.map((inv) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5),
            ),
            child: Row(
              children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.insert_drive_file_outlined, color: Color(0xFF3B6D11), size: 18),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(inv['numero_facture'] ?? 'Facture N/A', style: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 12, color: const Color(0xFF26C485))),
                      Text(inv['service_label'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: Colors.black54), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("${(inv['montant_ttc'] ?? 0).toStringAsFixed(2)} €", style: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 13, color: const Color(0xFF0F172A))),
                    Text(inv['date_emission'] != null ? DateTime.tryParse(inv['date_emission'])?.toLocal().toString().split(' ')[0] ?? '' : '', style: GoogleFonts.inter(fontSize: 10, color: Colors.black45)),
                  ],
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => _downloadInvoice(inv['id']),
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.download, color: Color(0xFF3B6D11), size: 16),
                  ),
                )
              ],
            ),
          )).toList(),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
            child: Center(child: Text("Aucune facture disponible.", style: GoogleFonts.inter(color: Colors.black38, fontSize: 12))),
          ),
        ],
        const SizedBox(height: 32),

        // Assistant Intelligent
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(14)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 34, height: 34,
                    decoration: BoxDecoration(
                      color: const Color(0xFF26C485).withOpacity(0.12), shape: BoxShape.circle, border: Border.all(color: const Color(0xFF26C485).withOpacity(0.2), width: 1.0)
                    ),
                    child: const Icon(Icons.smart_toy_outlined, color: Color(0xFF26C485), size: 16),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("EnerQR Assistant", style: GoogleFonts.outfit(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                      Text("● En ligne", style: GoogleFonts.inter(color: const Color(0xFF26C485).withOpacity(0.6), fontSize: 10)),
                    ],
                  )
                ],
              ),
              const SizedBox(height: 16),
              Container(height: 0.5, color: Colors.white.withOpacity(0.07)),
              const SizedBox(height: 16),
              
              ...chatMessages.map((msg) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                alignment: msg['sender'] == 'ai' ? Alignment.centerLeft : Alignment.centerRight,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: msg['sender'] == 'ai' ? Colors.white.withOpacity(0.05) : const Color(0xFF26C485).withOpacity(0.2),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(10),
                      topRight: const Radius.circular(10),
                      bottomLeft: msg['sender'] == 'ai' ? const Radius.circular(2) : const Radius.circular(10),
                      bottomRight: msg['sender'] == 'user' ? const Radius.circular(2) : const Radius.circular(10),
                    ),
                  ),
                  child: Text(msg['text']!, style: GoogleFonts.inter(color: Colors.white.withOpacity(0.75), fontSize: 12)),
                ),
              )).toList(),

              if (isChatLoading) 
                Align(alignment: Alignment.centerLeft, child: Padding(padding: const EdgeInsets.all(8.0), child: Text("En train d'écrire...", style: GoogleFonts.inter(color: Colors.white.withOpacity(0.3), fontSize: 10)))),

              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withOpacity(0.08), width: 0.5),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _chatController,
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 12),
                        decoration: InputDecoration(
                          hintText: "Posez une question...",
                          hintStyle: GoogleFonts.inter(color: Colors.white.withOpacity(0.2), fontSize: 12),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: _sendMessageToAI,
                      child: Container(
                        width: 30, height: 30, margin: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(color: const Color(0xFF26C485), borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.send, color: Colors.white, size: 15),
                      ),
                    )
                  ],
                ),
              )
            ],
          ),
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildHeroChip(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.07),
          border: Border.all(color: Colors.white.withOpacity(0.1), width: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.inter(color: Colors.white.withOpacity(0.3), fontSize: 9)),
            const SizedBox(height: 2),
            Text(value, style: GoogleFonts.outfit(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Widget _buildClientStatCard(String label, String val1, String val2, IconData icon, Color bgIcon, Color colorIcon, String tagText, Color tagBg, Color tagColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(color: bgIcon, borderRadius: BorderRadius.circular(9)),
                child: Icon(icon, color: colorIcon, size: 16),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: tagBg, borderRadius: BorderRadius.circular(4)),
                child: Text(tagText, style: GoogleFonts.inter(color: tagColor, fontSize: 10, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(val1, style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.w500)),
              const SizedBox(width: 4),
              Text(val2, style: GoogleFonts.inter(color: Colors.black54, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(color: Colors.black45, fontSize: 11)),
        ],
      ),
    );
  }

  // --- COMPOSANTS ADMIN ---
  Widget _buildChartBar(double height, String label, {bool isActive = false}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 24, height: height,
          decoration: BoxDecoration(
            color: const Color(0xFF26C485).withOpacity(isActive ? 1.0 : 0.5),
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(4)),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: GoogleFonts.inter(color: Colors.black45, fontSize: 9)),
      ],
    );
  }

  Widget _buildAdminKpi(String label, String value, IconData icon, Color bgIcon, Color colorIcon, String trendStr, bool trendPos) {
    return Container(
       padding: const EdgeInsets.all(12),
       decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
       child: Column(
         crossAxisAlignment: CrossAxisAlignment.start,
         mainAxisAlignment: MainAxisAlignment.spaceBetween,
         children: [
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               Container(width: 34, height: 34, decoration: BoxDecoration(color: bgIcon, borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: colorIcon, size: 16)),
               Container(
                 padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                 decoration: BoxDecoration(color: trendPos ? const Color(0xFFEAF3DE) : const Color(0xFFFCEBEB), borderRadius: BorderRadius.circular(4)),
                 child: Text(trendStr, style: GoogleFonts.inter(color: trendPos ? const Color(0xFF3B6D11) : const Color(0xFFA32D2D), fontSize: 9, fontWeight: FontWeight.w500)),
               )
             ],
           ),
           Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               Text(value, style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 22, fontWeight: FontWeight.w500)),
               Text(label, style: GoogleFonts.inter(color: Colors.black54, fontSize: 11)),
             ],
           )
         ],
       ),
    );
  }
  
  Widget _buildAdminDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2, childAspectRatio: 1.5, mainAxisSpacing: 12, crossAxisSpacing: 12,
          children: [
            _buildAdminKpi("Total Clients", stats?['total_clients']?.toString() ?? "0", Icons.people, const Color(0xFFEEEDFE), const Color(0xFF534AB7), "↗ 12%", true),
            _buildAdminKpi("Parc Pompes", stats?['total_pumps']?.toString() ?? "0", Icons.bolt, const Color(0xFFFAEEDA), const Color(0xFF854F0B), "↗ 8%", true),
            _buildAdminKpi("Activations RGPD", "100%", Icons.check_circle_outline, const Color(0xFFEAF3DE), const Color(0xFF3B6D11), "↗ 2%", true),
            _buildAdminKpi("Alertes IA", anomalies.length.toString(), Icons.warning_amber_rounded, const Color(0xFFFCEBEB), const Color(0xFFA32D2D), "↘ 1", false),
          ],
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity, padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Économies globales estimées", style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w500)),
              Text("Tendance énergétique des 6 derniers mois (kWh)", style: GoogleFonts.inter(color: Colors.black45, fontSize: 11)),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly, crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _buildChartBar(30, "Jan"), _buildChartBar(45, "Fév"), _buildChartBar(35, "Mar"), _buildChartBar(60, "Avr"), _buildChartBar(50, "Mai"), _buildChartBar(72, "Juin", isActive: true),
                ],
              )
            ],
          ),
        )
      ],
    );
  }

  Widget _buildAdminClientsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Liste des Clients"),
        const SizedBox(height: 16),
        ...clients.map((c) => Container(
          margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Row(
            children: [
              const Icon(Icons.person, color: Color(0xFF26C485), size: 24),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c['username'] ?? 'Inconnu', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500)),
                    Text(c['email'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: Colors.black54)),
                  ],
                ),
              ),
              if (c['consentement_rgpd'] == true)
                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(6)), child: Text("RGPD OK", style: GoogleFonts.inter(color: const Color(0xFF3B6D11), fontSize: 10)))
            ],
          ),
        )).toList()
      ],
    );
  }

  Widget _buildAdminPumpsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Parc des Pompes"),
        const SizedBox(height: 16),
        ...pumps.map((p) => Container(
          margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(p['modele_pac'] ?? 'Modèle inconnu', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500)),
                  if (p['ia_anomaly'] == true)
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFFCEBEB), borderRadius: BorderRadius.circular(6)), child: Text("Alerte IA", style: GoogleFonts.inter(color: const Color(0xFFA32D2D), fontSize: 10)))
                ],
              ),
              const SizedBox(height: 4),
              Text("Client: ${p['client_username'] ?? 'Inconnu'}  •  Zone: ${p['zone_climatique'] ?? '-'}", style: GoogleFonts.inter(fontSize: 11, color: Colors.black54)),
            ],
          ),
        )).toList()
      ],
    );
  }

  Widget _buildAdminTechsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Équipe Technique"),
        const SizedBox(height: 16),
        ...techniciens.map((t) => Container(
          margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Row(
            children: [
              Container(
                width: 38, height: 38, decoration: BoxDecoration(color: const Color(0xFFEEEDFE), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.build_outlined, color: Color(0xFF534AB7), size: 18),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t['username'] ?? 'Inconnu', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500)),
                    Text("${t['anomalies_en_cours'] ?? 0} interventions en cours", style: GoogleFonts.inter(fontSize: 11, color: Colors.black54)),
                  ],
                ),
              ),
            ],
          ),
        )).toList()
      ],
    );
  }

  Widget _buildAdminAnomaliesList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Suivi des Anomalies"),
        const SizedBox(height: 16),
        ...anomalies.map((a) => _buildTechAnomalyRow(a)).toList()
      ],
    );
  }

  Widget _buildAdminGarantiesList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Garanties & Factures"),
        const SizedBox(height: 16),
        ...garanties.map((g) => Container(
          margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Client: ${g['client_username'] ?? '?'}", style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), 
                    decoration: BoxDecoration(color: g['sous_garantie'] == true ? const Color(0xFFEAF3DE): const Color(0xFFFCEBEB), borderRadius: BorderRadius.circular(6)), 
                    child: Text(g['sous_garantie'] == true ? "Sous Garantie" : "Expirée", style: GoogleFonts.inter(color: g['sous_garantie'] == true ? const Color(0xFF3B6D11) : const Color(0xFFA32D2D), fontSize: 10))
                  )
                ],
              ),
              const SizedBox(height: 4),
              Text("PAC: ${g['modele_pac'] ?? '-'}", style: GoogleFonts.inter(fontSize: 11, color: Colors.black54)),
            ],
          ),
        )).toList()
      ],
    );
  }

  // --- COMPOSANTS TECHNICIEN ---
  Widget _buildTechTab(String label, bool isActive) {
    return GestureDetector(
      onTap: () {
        if (label == "Anomalies") setState(() => activeTab = 'anomalies');
        else setState(() => activeTab = 'my_clients');
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: isActive ? const Color(0xFF26C485) : Colors.transparent, width: 2.5))),
        child: Center(child: Text(label, style: GoogleFonts.outfit(color: isActive ? const Color(0xFF26C485) : Colors.black54, fontWeight: isActive ? FontWeight.w500 : FontWeight.w400, fontSize: 14))),
      ),
    );
  }

  Widget _buildTechCounter(int level, String label, Color color, String count) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(count, style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 24, fontWeight: FontWeight.w500)),
              const SizedBox(width: 6),
              Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            ],
          ),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.inter(color: Colors.black54, fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildTechAnomalyRow(dynamic a) {
    final int niveau = a['niveau'] ?? 1;
    Color badgeBg = const Color(0xFFFAEEDA); Color badgeText = const Color(0xFF854F0B); String badgeLabel = "Niveau 1";
    if (niveau == 3) { badgeBg = const Color(0xFFFCEBEB); badgeText = const Color(0xFFA32D2D); badgeLabel = "Niveau 3"; }
    else if (niveau == 2) { badgeBg = const Color(0xFFFAECE7); badgeText = const Color(0xFF993C1D); badgeLabel = "Niveau 2"; }

    return Container(
      margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(a['client_username'] ?? "Client Inconnu", style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.w500)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(99)),
                child: Text(badgeLabel, style: GoogleFonts.outfit(color: badgeText, fontSize: 11, fontWeight: FontWeight.w500)),
              )
            ],
          ),
          const SizedBox(height: 4),
          Text("${a['modele_pac'] ?? 'Modèle inconnu'} · ${a['zone_climatique'] ?? 'H1'}", style: GoogleFonts.inter(color: Colors.black54, fontSize: 11)),
          const SizedBox(height: 12),
          Container(height: 0.5, color: Colors.black.withOpacity(0.08)),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(6)),
                child: Text(a['statut'] ?? "Ouvert", style: GoogleFonts.inter(color: const Color(0xFF3B6D11), fontSize: 10, fontWeight: FontWeight.w500)),
              ),
              const Spacer(),
              Text("Action requise", style: GoogleFonts.inter(color: Colors.black45, fontSize: 11)),
              const SizedBox(width: 12),
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(color: const Color(0xFFEAF3DE), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.chevron_right, color: Color(0xFF3B6D11), size: 16),
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildTechClientsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Mes Clients Assignés"),
        const SizedBox(height: 16),
        if (clients.isEmpty) 
           Text("Aucun client encore assigné.", style: GoogleFonts.inter(color: Colors.black54, fontSize: 12)),
        ...clients.map((c) => Container(
          margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.black.withOpacity(0.08), width: 0.5)),
          child: Row(
            children: [
              Container(
                width: 44, height: 44, decoration: BoxDecoration(color: const Color(0xFF26C485).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.person, color: Color(0xFF26C485), size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c['username'] ?? 'Inconnu', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500, color: const Color(0xFF0F172A))),
                    Text("${c['pump_model'] ?? 'PAC Inconnue'} • ${c['ville'] ?? 'Ville inconnue'}", style: GoogleFonts.inter(fontSize: 11, color: Colors.black54)),
                  ],
                ),
              ),
            ],
          ),
        )).toList()
      ],
    );
  }
}
